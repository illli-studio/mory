import { computeStats, createMemory, matchesMemory, mergeSnapshots, type CreateMemoryInput, type MemoryKind, type MemoryObject } from "@mory/memory-core";
import { create } from "zustand";
import { applyRepositorySnapshot, clearMemories, deleteMemory, importMemoryBatch, loadMemories, loadRepositorySnapshot, saveMemory, updateMemory } from "./db";
import { hasGithubConfig, pullGithubSnapshot, pushGithubMemories, type GithubSyncConfig } from "./github-sync";

const defaultGithubConfig: GithubSyncConfig = {
  provider: "",
  token: "",
  owner: "",
  repo: "",
  branch: "",
  path: "",
  autoSync: false,
  deviceName: "",
};

interface MemoryState {
  memories: MemoryObject[];
  query: string;
  kindFilter: MemoryKind | "all";
  source: string;
  timeRange: "all" | "today" | "week" | "month";
  privacy: "all" | "public" | "private";
  tagFilter: string;
  sortBy: "newest" | "score";
  isLoading: boolean;
  error?: string;
  syncMessage?: string;
  github: GithubSyncConfig;
  load: () => Promise<void>;
  add: (input: CreateMemoryInput) => Promise<boolean>;
  importMany: (inputs: CreateMemoryInput[]) => Promise<void>;
  update: (memory: MemoryObject) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  updateGithub: (config: Partial<GithubSyncConfig>) => void;
  pushGithub: () => Promise<void>;
  pullGithub: () => Promise<void>;
  mergeGithub: () => Promise<void>;
  setQuery: (query: string) => void;
  setKindFilter: (kind: MemoryKind | "all") => void;
  setSource: (source: string) => void;
  setTimeRange: (timeRange: MemoryState["timeRange"]) => void;
  setPrivacy: (privacy: MemoryState["privacy"]) => void;
  setTagFilter: (tagFilter: string) => void;
  setSortBy: (sortBy: MemoryState["sortBy"]) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  query: "",
  kindFilter: "all",
  source: "all",
  timeRange: "all",
  privacy: "all",
  tagFilter: "",
  sortBy: "newest",
  isLoading: true,
  github: loadGithubConfig(),
  async load() {
    set({ isLoading: true, error: undefined });
    try {
      const loaded = (await loadMemories()).map(normalizeMemory);
      set({ memories: loaded, isLoading: false });
      // Loading never uploads data unless automatic sync was explicitly enabled.
      if (hasGithubConfig(get().github) && get().github.autoSync) void get().mergeGithub();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load memories.", isLoading: false });
    }
  },
  async add(input) {
    set({ error: undefined });
    try {
      const memory = await createMemory(input);
      memory.origin = getDeviceOrigin(get().github.deviceName);
      memory.updatedAt = new Date().toISOString();
      const saved = await saveMemory(memory);
      set({ memories: [saved, ...get().memories] });
      queueAutoSync(get);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to save memory." });
      return false;
    }
  },
  async importMany(inputs) {
    set({ error: undefined });
    try {
      const created = await Promise.all(inputs.map((input) => createMemory(input)));
      created.forEach((memory) => { memory.origin = getDeviceOrigin(get().github.deviceName); memory.updatedAt = new Date().toISOString(); });
      const result = await importMemoryBatch(created);
      const savedCount = result.addedCount;
      const skippedCount = result.duplicateCount;
      const detail = skippedCount ? ` Skipped ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"}.` : "";
      set({ memories: (await loadMemories()).map(normalizeMemory), syncMessage: `Imported ${savedCount} memory object${savedCount === 1 ? "" : "s"}.${detail}` });
      queueAutoSync(get);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Import failed." });
    }
  },
  async update(memory) {
    const next = { ...memory, origin: memory.origin ?? getDeviceOrigin(get().github.deviceName), updatedAt: new Date().toISOString() };
    try {
      const saved = await updateMemory(next);
      set({ memories: get().memories.map((item) => (item.id === saved.id ? saved : item)), error: undefined });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Update failed." });
      return false;
    }
    queueAutoSync(get);
    return true;
  },
  async remove(id) {
    try {
      await deleteMemory(id, get().memories.find(memory => memory.id === id)?.revision);
      set({ memories: get().memories.filter((memory) => memory.id !== id), error: undefined });
      queueAutoSync(get);
    } catch (error) { set({ error: error instanceof Error ? error.message : "Delete failed." }); }
  },
  async clear() {
    try {
      await clearMemories();
      set({ memories: [], error: undefined });
      queueAutoSync(get);
    } catch (error) { set({ error: error instanceof Error ? error.message : "Clear failed." }); }
  },
  updateGithub(config) {
    const github = { ...get().github, ...config };
    if (config.deviceName) localStorage.setItem("mory.deviceName", config.deviceName);
    localStorage.setItem("mory.github", JSON.stringify(github));
    set({ github });
  },
  async pushGithub() { await synchronize("push"); },
  async pullGithub() { await synchronize("pull"); },
  async mergeGithub() { await synchronize("merge"); },
  setQuery(query) {
    set({ query });
  },
  setKindFilter(kindFilter) {
    set({ kindFilter });
  },
  setSource(source) {
    set({ source });
  },
  setTimeRange(timeRange) {
    set({ timeRange });
  },
  setPrivacy(privacy) {
    set({ privacy });
  },
  setTagFilter(tagFilter) {
    set({ tagFilter });
  },
  setSortBy(sortBy) {
    set({ sortBy });
  },
}));

export function selectFilteredMemories(state: MemoryState): MemoryObject[] {
  const now = new Date();
  const filtered = state.memories.filter((memory) => {
    const sourceMatches = state.source === "all" || memory.source === state.source;
    const kindMatches = state.kindFilter === "all" || (memory.kind ?? "note") === state.kindFilter;
    const privacyMatches = state.privacy === "all" || (state.privacy === "private" ? memory.isPrivate : !memory.isPrivate);
    const tagMatches = !state.tagFilter.trim() || memory.tags.some((tag) => tag.includes(state.tagFilter.trim().replace(/^#/, "").toLowerCase()));
    const timeMatches = matchesTimeRange(memory.capturedAt, state.timeRange, now);
    return sourceMatches && kindMatches && privacyMatches && tagMatches && timeMatches && matchesMemory(memory, state.query);
  });

  return filtered.sort((a, b) => {
    if (state.sortBy === "score") {
      return (b.score ?? 0) - (a.score ?? 0) || String(b.capturedAt ?? "").localeCompare(String(a.capturedAt ?? ""));
    }
    return String(b.capturedAt ?? "").localeCompare(String(a.capturedAt ?? ""));
  });
}

function normalizeMemory(memory: MemoryObject): MemoryObject {
  const candidate = memory as Partial<MemoryObject> & { payload?: Partial<MemoryObject["payload"]>; origin?: Partial<NonNullable<MemoryObject["origin"]>> };
  const payload = (candidate.payload ?? {}) as Partial<MemoryObject["payload"]>;
  const validTypes = ["raw", "preview", "snapshot", "relation"] as const;
  const source = typeof candidate.source === "string" && candidate.source ? candidate.source : "manual";
  const type = validTypes.includes(candidate.type as typeof validTypes[number]) ? candidate.type! : "raw";

  return {
    ...memory,
    id: String(candidate.id ?? crypto.randomUUID()),
    source,
    type,
    capturedAt: typeof candidate.capturedAt === "string" && candidate.capturedAt ? candidate.capturedAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt ? candidate.updatedAt : (typeof candidate.capturedAt === "string" && candidate.capturedAt ? candidate.capturedAt : new Date().toISOString()),
    contentHash: String(candidate.contentHash ?? candidate.id ?? crypto.randomUUID()),
    payload: {
      title: String(payload.title ?? "Untitled memory"),
      content: String(payload.content ?? ""),
      url: payload.url ? String(payload.url) : undefined,
    },
    tags: Array.isArray(candidate.tags) ? candidate.tags.map(String) : [],
    score: typeof candidate.score === "number" && Number.isFinite(candidate.score) ? candidate.score : 1,
    schemaVersion: typeof candidate.schemaVersion === "number" ? candidate.schemaVersion : 1,
    fields: candidate.fields && typeof candidate.fields === "object" ? candidate.fields : {},
    origin: candidate.origin && typeof candidate.origin === "object" ? { deviceId: String(candidate.origin.deviceId ?? ""), deviceName: String(candidate.origin.deviceName ?? "") } : undefined,
  };
}

export function selectStats(state: MemoryState) {
  return computeStats(state.memories);
}

function matchesTimeRange(capturedAt: string, range: MemoryState["timeRange"], now: Date): boolean {
  if (range === "all") {
    return true;
  }

  const captured = new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) {
    return false;
  }
  const diffMs = now.getTime() - captured.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (range === "today") {
    return captured.toDateString() === now.toDateString();
  }

  if (range === "week") {
    return diffMs >= 0 && diffMs <= 7 * dayMs;
  }

  return diffMs >= 0 && diffMs <= 30 * dayMs;
}

function loadGithubConfig(): GithubSyncConfig {
  try {
    const saved = JSON.parse(localStorage.getItem("mory.github") ?? "{}") as Partial<GithubSyncConfig>;
    return { ...defaultGithubConfig, ...saved };
  } catch {
    return { ...defaultGithubConfig };
  }
}

function getDeviceOrigin(deviceName: string) {
  let deviceId = localStorage.getItem("mory.deviceId");
  if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem("mory.deviceId", deviceId); }
  return { deviceId, deviceName: deviceName || localStorage.getItem("mory.deviceName") || navigator.platform || "This device" };
}

let autoSyncTimer: number | undefined;
let syncInFlight = false;
let syncAgain = false;
async function synchronize(direction: "push" | "pull" | "merge") {
  const { github } = useMemoryStore.getState();
  if (!hasGithubConfig(github)) { useMemoryStore.setState({ error: "Configure the remote repository before syncing." }); return; }
  if (syncInFlight) { syncAgain = true; return; }
  syncInFlight = true;
  useMemoryStore.setState({ error: undefined, syncMessage: "Syncing memories..." });
  try {
    const local = await loadRepositorySnapshot();
    const result = direction === "pull"
      ? mergeSnapshots(local, await pullGithubSnapshot(github))
      : (await pushGithubMemories(github, local.memories, local.tombstones)).snapshot;
    // A repository switch during the request must not apply the previous connection's snapshot.
    const current = useMemoryStore.getState().github;
    if (["provider", "owner", "repo", "branch", "path"].some(key => current[key as keyof GithubSyncConfig] !== github[key as keyof GithubSyncConfig])) return;
    const applied = await applyRepositorySnapshot({ ...local, ...result }, local.generation);
    const conflictCount = applied.memories.filter(memory => memory.id.includes("~conflict~")).length;
    useMemoryStore.setState({ memories: applied.memories.map(normalizeMemory), syncMessage: `Synced ${applied.memories.length} memories.${conflictCount ? ` ${conflictCount} conflicting copies retained for review.` : ""}` });
  } catch (error) {
    useMemoryStore.setState({ error: error instanceof Error ? error.message : "Sync failed. Local data was preserved.", syncMessage: undefined });
  } finally {
    syncInFlight = false;
    if (syncAgain) { syncAgain = false; window.setTimeout(() => void synchronize("merge"), 1200); }
  }
}
function queueAutoSync(get: () => MemoryState): void {
  if (!get().github.autoSync || !hasGithubConfig(get().github)) return;
  window.clearTimeout(autoSyncTimer);
  autoSyncTimer = window.setTimeout(() => void get().mergeGithub(), 1200);
}
