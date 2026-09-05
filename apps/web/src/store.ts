import { computeStats, createMemory, matchesMemory, type CreateMemoryInput, type MemoryKind, type MemoryObject } from "@mory/memory-core";
import { create } from "zustand";
import { clearMemories, deleteMemory, loadMemories, saveMemory, updateMemory, upsertMemories } from "./db";
import { hasGithubConfig, mergeGithubMemories, pullGithubSnapshot, pushGithubMemories, SyncConflictError, type GithubSyncConfig } from "./github-sync";

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
  update: (memory: MemoryObject) => Promise<void>;
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
      // A newly installed runtime can have an empty SQLite repository while the
      // configured GitHub repository already contains the user's memories. Do a
      // one-time merge in that case so switching storage backends does not hide
      // the remote history. Existing local data still respects autoSync.
      if (hasGithubConfig(get().github) && (get().github.autoSync || loaded.length === 0)) void get().mergeGithub();
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
      await saveMemory(memory);
      set({ memories: [memory, ...get().memories] });
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
      let savedCount = 0;
      let skippedCount = 0;
      for (const memory of created) {
        try {
          await saveMemory(memory);
          savedCount += 1;
        } catch {
          skippedCount += 1;
        }
      }
      const detail = skippedCount ? ` Skipped ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"}.` : "";
      set({ memories: (await loadMemories()).map(normalizeMemory), syncMessage: `Imported ${savedCount} memory object${savedCount === 1 ? "" : "s"}.${detail}` });
      queueAutoSync(get);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Import failed." });
    }
  },
  async update(memory) {
    const next = { ...memory, origin: memory.origin ?? getDeviceOrigin(get().github.deviceName), updatedAt: new Date().toISOString() };
    await updateMemory(next);
    set({ memories: get().memories.map((item) => (item.id === next.id ? next : item)) });
    queueAutoSync(get);
  },
  async remove(id) {
    await deleteMemory(id);
    set({ memories: get().memories.filter((memory) => memory.id !== id) });
    addTombstone(id);
    queueAutoSync(get);
  },
  async clear() {
    const ids = get().memories.map((memory) => memory.id);
    await clearMemories();
    set({ memories: [] });
    ids.forEach(addTombstone);
    queueAutoSync(get);
  },
  updateGithub(config) {
    const github = { ...get().github, ...config };
    if (config.deviceName) localStorage.setItem("mory.deviceName", config.deviceName);
    localStorage.setItem("mory.github", JSON.stringify(github));
    set({ github });
  },
  async pushGithub() {
    const { github, memories } = get();
    if (!hasGithubConfig(github)) {
      set({ error: "GitHub sync needs token, owner, repo, branch and path." });
      return;
    }
    if (syncInFlight) return;
    syncInFlight = true;
    set({ error: undefined, syncMessage: "Pushing memories to GitHub..." });
    try {
      const result = await pushGithubMemories(github, memories);
      localStorage.setItem("mory.sync.tombstones", JSON.stringify([]));
      const uploadedCount = result.uploadedCount ?? memories.length;
      set({ syncMessage: `Pushed ${uploadedCount} memory objects to ${github.provider === "gitee" ? "Gitee" : "GitHub"}.` });
    } catch (error) {
      if (error instanceof SyncConflictError) {
        set({ error: undefined, syncMessage: "Merging local and remote memories..." });
        queueConflictRetry(get);
        return;
      }
      set({ error: error instanceof Error ? error.message : "GitHub push failed.", syncMessage: undefined });
    } finally {
      syncInFlight = false;
    }
  },
  async pullGithub() {
    const { github, memories: localMemories } = get();
    if (!hasGithubConfig(github)) {
      set({ error: "GitHub sync needs token, owner, repo, branch and path." });
      return;
    }
    if (syncInFlight) return;
    syncInFlight = true;
    set({ error: undefined, syncMessage: "Pulling memories from the remote repository..." });
    try {
      const remoteSnapshot = await pullGithubSnapshot(github);
      const remoteMemories = remoteSnapshot.memories;
      const remoteTombstones = new Set(remoteSnapshot.tombstones);
      const localById = new Map(localMemories.map((memory) => [memory.id, memory]));
      const conflicts = remoteMemories.filter((remote) => {
        const local = localById.get(remote.id);
        return local && local.contentHash !== remote.contentHash;
      }).length;
      const merged = new Map(Array.from(localById).filter(([id]) => !remoteTombstones.has(id)));

      for (const remote of remoteMemories) {
        if (!merged.has(remote.id)) {
          merged.set(remote.id, remote);
        }
      }

      const memories = Array.from(merged.values()).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
      await clearMemories();
      await upsertMemories(memories);
      localStorage.setItem("mory.sync.tombstones", JSON.stringify(remoteSnapshot.tombstones));
      const normalized = memories.map(normalizeMemory);
      set({ memories: normalized, syncMessage: `Pulled ${normalized.length} memory objects from ${github.provider === "gitee" ? "Gitee" : "GitHub"}.` });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "GitHub pull failed.", syncMessage: undefined });
    } finally {
      syncInFlight = false;
    }
  },
  async mergeGithub() {
    const { github, memories } = get();
    if (!hasGithubConfig(github)) {
      set({ error: "GitHub sync needs token, owner, repo, branch and path." });
      return;
    }
    if (syncInFlight) return;
    syncInFlight = true;
    set({ error: undefined, syncMessage: "Merging local and remote memories..." });
    try {
      let merged: Awaited<ReturnType<typeof mergeGithubMemories>> | undefined;
      for (let attempt = 0; attempt < 4 && !merged; attempt += 1) {
        const candidate = await mergeGithubMemories(github, memories, loadTombstones());
        try {
          await pushGithubMemories(github, candidate.memories, candidate.tombstones);
          merged = candidate;
        } catch (error) {
          if (!(error instanceof SyncConflictError) || attempt === 3) throw error;
        }
      }
      if (!merged) throw new SyncConflictError();
      await clearMemories();
      await upsertMemories(merged.memories);
      set({ memories: merged.memories, syncMessage: `Merged and pushed ${merged.memories.length} memory objects.` });
      localStorage.setItem("mory.sync.tombstones", JSON.stringify(merged.tombstones));
    } catch (error) {
      if (error instanceof SyncConflictError) {
        set({ error: undefined, syncMessage: "Merging local and remote memories..." });
        queueConflictRetry(get);
        return;
      }
      set({ error: error instanceof Error ? error.message : "GitHub merge failed.", syncMessage: undefined });
    } finally {
      syncInFlight = false;
    }
  },
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
  const validSources = ["manual", "clipboard", "browser", "file", "chat", "github"] as const;
  const validTypes = ["raw", "preview", "snapshot", "relation"] as const;
  const source = validSources.includes(candidate.source as typeof validSources[number]) ? candidate.source! : "manual";
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
    return captured.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  }

  if (range === "week") {
    return diffMs <= 7 * dayMs;
  }

  return diffMs <= 30 * dayMs;
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

function loadTombstones(): string[] {
  try { return JSON.parse(localStorage.getItem("mory.sync.tombstones") ?? "[]") as string[]; } catch { return []; }
}

function addTombstone(id: string): void {
  const tombstones = new Set(loadTombstones()); tombstones.add(id); localStorage.setItem("mory.sync.tombstones", JSON.stringify(Array.from(tombstones)));
}

let autoSyncTimer: number | undefined;
let syncInFlight = false;
function queueAutoSync(get: () => MemoryState): void {
  if (!get().github.autoSync || !hasGithubConfig(get().github)) return;
  window.clearTimeout(autoSyncTimer);
  autoSyncTimer = window.setTimeout(() => void get().mergeGithub(), 1200);
}

function queueConflictRetry(get: () => MemoryState): void {
  if (!get().github.autoSync || !hasGithubConfig(get().github)) return;
  window.clearTimeout(autoSyncTimer);
  autoSyncTimer = window.setTimeout(() => void get().mergeGithub(), 5000);
}
