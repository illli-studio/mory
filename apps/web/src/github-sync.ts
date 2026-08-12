import type { MemoryObject } from "@mory/memory-core";

export interface GithubSyncConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

interface GithubFileResponse {
  content: string;
  encoding: string;
  sha: string;
}

export interface SyncResult {
  message: string;
  remoteCount?: number;
  uploadedCount?: number;
  mergedCount?: number;
}

const apiBase = "https://api.github.com";

export function normalizeGithubConfig(config: GithubSyncConfig): GithubSyncConfig {
  return {
    token: config.token.trim(),
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    branch: config.branch.trim() || "main",
    path: config.path.trim() || "mory/memories.json",
  };
}

export function hasGithubConfig(config: GithubSyncConfig): boolean {
  const next = normalizeGithubConfig(config);
  return Boolean(next.token && next.owner && next.repo && next.branch && next.path);
}

export async function pullGithubMemories(config: GithubSyncConfig): Promise<MemoryObject[]> {
  const file = await fetchGithubFile(normalizeGithubConfig(config));
  if (!file) {
    return [];
  }

  const decoded = decodeBase64(file.content);
  const parsed = JSON.parse(decoded) as { memories?: MemoryObject[] } | MemoryObject[];
  return Array.isArray(parsed) ? parsed : parsed.memories ?? [];
}

export async function pushGithubMemories(config: GithubSyncConfig, memories: MemoryObject[]): Promise<SyncResult> {
  const normalized = normalizeGithubConfig(config);
  const existing = await fetchGithubFile(normalized);
  const body = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    memories,
  };

  const response = await fetch(`${apiBase}/repos/${normalized.owner}/${normalized.repo}/contents/${encodeURIComponentPath(normalized.path)}`, {
    method: "PUT",
    headers: githubHeaders(normalized.token),
    body: JSON.stringify({
      message: `sync: update Mory memory repository (${memories.length})`,
      content: encodeBase64(JSON.stringify(body, null, 2)),
      branch: normalized.branch,
      sha: existing?.sha,
    }),
  });

  if (!response.ok) {
    throw new Error(await githubError(response));
  }

  return {
    message: "Pushed local memory repository to GitHub.",
    uploadedCount: memories.length,
  };
}

export async function mergeGithubMemories(config: GithubSyncConfig, localMemories: MemoryObject[]): Promise<MemoryObject[]> {
  const remoteMemories = await pullGithubMemories(config);
  const byId = new Map<string, MemoryObject>();

  for (const memory of [...remoteMemories, ...localMemories]) {
    byId.set(memory.id, memory);
  }

  return Array.from(byId.values()).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

async function fetchGithubFile(config: GithubSyncConfig): Promise<GithubFileResponse | null> {
  const response = await fetch(
    `${apiBase}/repos/${config.owner}/${config.repo}/contents/${encodeURIComponentPath(config.path)}?ref=${encodeURIComponent(config.branch)}`,
    { headers: githubHeaders(config.token) },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await githubError(response));
  }

  return (await response.json()) as GithubFileResponse;
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function encodeBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64(value: string): string {
  return decodeURIComponent(escape(atob(value.replace(/\n/g, ""))));
}

function encodeURIComponentPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `GitHub request failed with ${response.status}`;
  } catch {
    return `GitHub request failed with ${response.status}`;
  }
}
