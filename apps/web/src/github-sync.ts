import type { MemoryObject } from "@mory/memory-core";

export type SyncProvider = "" | "github" | "gitee";
export interface GithubSyncConfig { provider: SyncProvider; token: string; owner: string; repo: string; branch: string; path: string; autoSync: boolean; deviceName: string; }
interface RemoteFileResponse { content: string; encoding: string; sha: string; }
export interface SyncEnvelope { schemaVersion: 2; exportedAt: string; memories: MemoryObject[]; tombstones: string[]; }
export interface SyncResult { message: string; uploadedCount?: number; }
export interface RepositoryConnection { owner: string; repo: string; branch: string; }
export class SyncConflictError extends Error {
  constructor() {
    super("SYNC_CONFLICT");
    this.name = "SyncConflictError";
  }
}

export const defaultSyncEnvelope = (memories: MemoryObject[], tombstones: string[] = []): SyncEnvelope => ({ schemaVersion: 2, exportedAt: new Date().toISOString(), memories, tombstones });

export function normalizeGithubConfig(config: GithubSyncConfig): GithubSyncConfig { return { provider: config.provider ?? "", token: config.token.trim(), owner: config.owner.trim(), repo: config.repo.trim(), branch: config.branch.trim(), path: config.path.trim(), autoSync: Boolean(config.autoSync), deviceName: config.deviceName.trim() }; }
export function hasGithubConfig(config: GithubSyncConfig): boolean { const next = normalizeGithubConfig(config); return Boolean(next.token && next.owner && next.repo && next.branch && next.path); }

export function parseRepositoryUrl(value: string): RepositoryConnection | null {
  const input = value.trim().replace(/\.git\/?$/, "").replace(/\/$/, "");
  const match = input.match(/^(?:https?:\/\/|git@)(?:github\.com[:/]|gitee\.com[:/])([^/]+)\/([^/]+)$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2], branch: "" };
}

export async function checkGithubConnection(config: GithubSyncConfig): Promise<{ branch: string }> {
  const normalized = normalizeGithubConfig(config);
  const base = normalized.provider === "gitee" ? "https://gitee.com/api/v5" : "https://api.github.com";
  const response = await fetch(`${base}/repos/${encodeURIComponent(normalized.owner)}/${encodeURIComponent(normalized.repo)}`, {
    headers: remoteHeaders(normalized),
  });
  if (!response.ok) throw new Error(await remoteError(response, normalized.provider));
  const repository = (await response.json()) as { default_branch?: string };
  return { branch: repository.default_branch ?? "main" };
}

export async function pullGithubSnapshot(config: GithubSyncConfig): Promise<SyncEnvelope> { const normalized = normalizeGithubConfig(config); const file = await fetchRemoteFile(normalized); if (!file) return defaultSyncEnvelope([]); const parsed = JSON.parse(decodeBase64(file.content)) as Partial<SyncEnvelope> | MemoryObject[]; if (Array.isArray(parsed)) return defaultSyncEnvelope(parsed); return { schemaVersion: 2, exportedAt: parsed.exportedAt ?? new Date().toISOString(), memories: Array.isArray(parsed.memories) ? parsed.memories : [], tombstones: Array.isArray(parsed.tombstones) ? parsed.tombstones : [] }; }
export async function pullGithubMemories(config: GithubSyncConfig): Promise<MemoryObject[]> { return (await pullGithubSnapshot(config)).memories; }

export async function pushGithubMemories(config: GithubSyncConfig, memories: MemoryObject[], tombstones: string[] = []): Promise<SyncResult> {
  const normalized = normalizeGithubConfig(config);
  let existing = await fetchRemoteFile(normalized);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(remoteEndpoint(normalized, false), {
        method: "PUT",
        headers: remoteHeaders(normalized),
        body: JSON.stringify({
          message: `sync: update Mory memories (${memories.length})`,
          content: encodeBase64(JSON.stringify(defaultSyncEnvelope(memories, tombstones), null, 2)),
          branch: normalized.branch,
          ...(existing?.sha ? { sha: existing.sha } : {}),
          ...(normalized.provider === "gitee" ? { access_token: normalized.token } : {}),
        }),
      });
    } catch (error) {
      if (attempt === 5) throw error;
      await retryDelay(attempt);
      continue;
    }
    if (response.ok) return { message: `Pushed local memories to ${normalized.provider === "gitee" ? "Gitee" : "GitHub"}.`, uploadedCount: memories.length };
    const message = await remoteError(response, normalized.provider);
    if (response.status === 409 && attempt === 5) throw new SyncConflictError();
    if (attempt === 5 || (![408, 409, 429].includes(response.status) && response.status < 500)) throw new Error(message);
    if (response.status === 409) existing = await fetchRemoteFile(normalized);
    else await retryDelay(attempt);
  }
  throw new Error(`${normalized.provider} push failed.`);
}

export async function mergeGithubMemories(config: GithubSyncConfig, localMemories: MemoryObject[], localTombstones: string[] = []) { const remote = await pullGithubSnapshot(config); const tombstones = new Set([...remote.tombstones, ...localTombstones]); const byId = new Map<string, MemoryObject>(); for (const memory of [...remote.memories, ...localMemories]) { if (tombstones.has(memory.id)) continue; const existing = byId.get(memory.id); if (!existing || (memory.updatedAt ?? memory.capturedAt) >= (existing.updatedAt ?? existing.capturedAt)) byId.set(memory.id, memory); } return { memories: Array.from(byId.values()).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)), tombstones: Array.from(tombstones) }; }

async function fetchRemoteFile(config: GithubSyncConfig): Promise<RemoteFileResponse | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(remoteEndpoint(config, true), { headers: remoteHeaders(config) });
      if (response.status === 404) return null;
      if (response.ok) return (await response.json()) as RemoteFileResponse;
      const message = await remoteError(response, config.provider);
      if (attempt === 2 || (![408, 429].includes(response.status) && response.status < 500)) throw new Error(message);
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await retryDelay(attempt);
  }
  return null;
}
async function retryDelay(attempt: number): Promise<void> { await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1))); }
function remoteEndpoint(config: GithubSyncConfig, read: boolean): string { const base = config.provider === "gitee" ? "https://gitee.com/api/v5" : "https://api.github.com"; const auth = config.provider === "gitee" ? `?access_token=${encodeURIComponent(config.token)}${read ? `&ref=${encodeURIComponent(config.branch)}` : ""}` : read ? `?ref=${encodeURIComponent(config.branch)}` : ""; return `${base}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${config.path.split("/").map(encodeURIComponent).join("/")}${auth}`; }
function remoteHeaders(config: GithubSyncConfig): HeadersInit { return config.provider === "gitee" ? { Accept: "application/json", Authorization: `token ${config.token}`, "Content-Type": "application/json" } : { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" }; }
function encodeBase64(value: string): string { return btoa(unescape(encodeURIComponent(value))); }
function decodeBase64(value: string): string { return decodeURIComponent(escape(atob(value.replace(/\n/g, "")))); }
async function remoteError(response: Response, provider: SyncProvider): Promise<string> { try { const body = (await response.json()) as { message?: string }; return body.message ?? `${provider} request failed with ${response.status}`; } catch { return `${provider} request failed with ${response.status}`; } }
function defaultDeviceName(): string { return typeof navigator !== "undefined" ? navigator.platform || "This device" : "This device"; }
