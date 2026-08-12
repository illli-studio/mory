import { computeStats, createMemory, matchesMemory, type CreateMemoryInput, type MemoryObject } from "@mory/memory-core";
import { create } from "zustand";
import { clearMemories, deleteMemory, loadMemories, saveMemory, updateMemory, upsertMemories } from "./db";
import { hasGithubConfig, mergeGithubMemories, pullGithubMemories, pushGithubMemories, type GithubSyncConfig } from "./github-sync";

const defaultGithubConfig: GithubSyncConfig = {
  token: "",
  owner: "illli-studio",
  repo: "mory",
  branch: "main",
  path: "mory/memories.json",
};

interface MemoryState {
  memories: MemoryObject[];
  query: string;
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
  add: (input: CreateMemoryInput) => Promise<void>;
  importMany: (inputs: CreateMemoryInput[]) => Promise<void>;
  update: (memory: MemoryObject) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  updateGithub: (config: Partial<GithubSyncConfig>) => void;
  pushGithub: () => Promise<void>;
  pullGithub: () => Promise<void>;
  mergeGithub: () => Promise<void>;
  setQuery: (query: string) => void;
  setSource: (source: string) => void;
  setTimeRange: (timeRange: MemoryState["timeRange"]) => void;
  setPrivacy: (privacy: MemoryState["privacy"]) => void;
  setTagFilter: (tagFilter: string) => void;
  setSortBy: (sortBy: MemoryState["sortBy"]) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  query: "",
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
      set({ memories: await loadMemories(), isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load memories.", isLoading: false });
    }
  },
  async add(input) {
    set({ error: undefined });
    try {
      const memory = await createMemory(input);
      await saveMemory(memory);
      set({ memories: [memory, ...get().memories] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to save memory." });
    }
  },
  async importMany(inputs) {
    set({ error: undefined });
    try {
      const created = await Promise.all(inputs.map((input) => createMemory(input)));
      for (const memory of created) {
        try {
          await saveMemory(memory);
        } catch {
          // Duplicate imports should not block the rest of the batch.
        }
      }
      set({ memories: await loadMemories(), syncMessage: `Imported ${created.length} memory objects.` });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Import failed." });
    }
  },
  async update(memory) {
    await updateMemory(memory);
    set({ memories: get().memories.map((item) => (item.id === memory.id ? memory : item)) });
  },
  async remove(id) {
    await deleteMemory(id);
    set({ memories: get().memories.filter((memory) => memory.id !== id) });
  },
  async clear() {
    await clearMemories();
    set({ memories: [] });
  },
  updateGithub(config) {
    const github = { ...get().github, ...config };
    localStorage.setItem("mory.github", JSON.stringify({ ...github, token: "" }));
    set({ github });
  },
  async pushGithub() {
    const { github, memories } = get();
    if (!hasGithubConfig(github)) {
      set({ error: "GitHub sync needs token, owner, repo, branch and path." });
      return;
    }
    set({ error: undefined, syncMessage: "Pushing memories to GitHub..." });
    try {
      const result = await pushGithubMemories(github, memories);
      set({ syncMessage: `${result.message} ${result.uploadedCount ?? memories.length} objects uploaded.` });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "GitHub push failed.", syncMessage: undefined });
    }
  },
  async pullGithub() {
    const { github } = get();
    if (!hasGithubConfig(github)) {
      set({ error: "GitHub sync needs token, owner, repo, branch and path." });
      return;
    }
    set({ error: undefined, syncMessage: "Pulling memories from GitHub..." });
    try {
      const memories = await pullGithubMemories(github);
      await clearMemories();
      await upsertMemories(memories);
      set({ memories, syncMessage: `Pulled ${memories.length} objects from GitHub.` });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "GitHub pull failed.", syncMessage: undefined });
    }
  },
  async mergeGithub() {
    const { github, memories } = get();
    if (!hasGithubConfig(github)) {
      set({ error: "GitHub sync needs token, owner, repo, branch and path." });
      return;
    }
    set({ error: undefined, syncMessage: "Merging local and GitHub memories..." });
    try {
      const merged = await mergeGithubMemories(github, memories);
      await upsertMemories(merged);
      await pushGithubMemories(github, merged);
      set({ memories: merged, syncMessage: `Merged and pushed ${merged.length} objects.` });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "GitHub merge failed.", syncMessage: undefined });
    }
  },
  setQuery(query) {
    set({ query });
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
    const privacyMatches = state.privacy === "all" || (state.privacy === "private" ? memory.isPrivate : !memory.isPrivate);
    const tagMatches = !state.tagFilter.trim() || memory.tags.some((tag) => tag.includes(state.tagFilter.trim().replace(/^#/, "").toLowerCase()));
    const timeMatches = matchesTimeRange(memory.capturedAt, state.timeRange, now);
    return sourceMatches && privacyMatches && tagMatches && timeMatches && matchesMemory(memory, state.query);
  });

  return filtered.sort((a, b) => {
    if (state.sortBy === "score") {
      return b.score - a.score || b.capturedAt.localeCompare(a.capturedAt);
    }
    return b.capturedAt.localeCompare(a.capturedAt);
  });
}

export function selectStats(state: MemoryState) {
  return computeStats(state.memories);
}

function matchesTimeRange(capturedAt: string, range: MemoryState["timeRange"], now: Date): boolean {
  if (range === "all") {
    return true;
  }

  const captured = new Date(capturedAt);
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
    return { ...defaultGithubConfig, ...saved, token: "" };
  } catch {
    return defaultGithubConfig;
  }
}
