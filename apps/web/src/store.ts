import { computeStats, createMemory, matchesMemory, type CreateMemoryInput, type MemoryObject } from "@mory/memory-core";
import { create } from "zustand";
import { clearMemories, loadMemories, saveMemory, upsertMemories } from "./db";
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
  isLoading: boolean;
  error?: string;
  syncMessage?: string;
  github: GithubSyncConfig;
  load: () => Promise<void>;
  add: (input: CreateMemoryInput) => Promise<void>;
  clear: () => Promise<void>;
  updateGithub: (config: Partial<GithubSyncConfig>) => void;
  pushGithub: () => Promise<void>;
  pullGithub: () => Promise<void>;
  mergeGithub: () => Promise<void>;
  setQuery: (query: string) => void;
  setSource: (source: string) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  query: "",
  source: "all",
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
}));

export function selectFilteredMemories(state: MemoryState): MemoryObject[] {
  return state.memories.filter((memory) => {
    const sourceMatches = state.source === "all" || memory.source === state.source;
    return sourceMatches && matchesMemory(memory, state.query);
  });
}

export function selectStats(state: MemoryState) {
  return computeStats(state.memories);
}

function loadGithubConfig(): GithubSyncConfig {
  try {
    const saved = JSON.parse(localStorage.getItem("mory.github") ?? "{}") as Partial<GithubSyncConfig>;
    return { ...defaultGithubConfig, ...saved, token: "" };
  } catch {
    return defaultGithubConfig;
  }
}
