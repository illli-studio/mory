import { mergeSnapshots, normalizeMemory, type MemoryObject } from "@mory/memory-core";

export type SyncProvider = "" | "github" | "gitee";
export interface GithubSyncConfig { provider: SyncProvider; token: string; owner: string; repo: string; branch: string; path: string; autoSync: boolean; deviceName: string; }
interface RemoteFileResponse { content: string; encoding: string; sha: string; }
export interface SyncEnvelope { schemaVersion: 2; exportedAt: string; memories: MemoryObject[]; tombstones: string[]; }
export interface SyncResult { message: string; uploadedCount?: number; snapshot: SyncEnvelope; }
export interface RepositoryConnection { owner: string; repo: string; branch: string; }
export class SyncConflictError extends Error {
  constructor() {
    super("SYNC_CONFLICT");
    this.name = "SyncConflictError";
  }
}

export const defaultSyncEnvelope = (memories: MemoryObject[], tombstones: string[] = []): SyncEnvelope => ({ schemaVersion: 2, exportedAt: new Date().toISOString(), memories, tombstones });

export function normalizeGithubConfig(config: GithubSyncConfig): GithubSyncConfig { return { provider: config.provider ?? "", token: config.token.trim(), owner: config.owner.trim(), repo: config.repo.trim(), branch: config.branch.trim() || "main", path: config.path.trim() || "mory/memories.json", autoSync: Boolean(config.autoSync), deviceName: config.deviceName.trim() }; }
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

export async function parseSyncSnapshot(value: unknown): Promise<SyncEnvelope> {
  const parsed = Array.isArray(value) ? { memories: value, tombstones: [] } : value as Partial<SyncEnvelope> | null;
  if (parsed && "schemaVersion" in parsed && parsed.schemaVersion !== undefined && ![1, 2, 3].includes(parsed.schemaVersion)) throw new Error("Unsupported remote snapshot version. Local data was preserved.");
  if (!parsed || !Array.isArray(parsed.memories) || (parsed.tombstones !== undefined && (!Array.isArray(parsed.tombstones) || parsed.tombstones.some(id => typeof id !== "string")))) throw new Error("Invalid remote memory snapshot. Local data was preserved.");
  const memories = await Promise.all(parsed.memories.map(normalizeMemory));
  const tombstones = [...new Set([...(parsed.tombstones ?? []), ...memories.filter(m => m.status !== "active").map(m => m.id)])];
  return defaultSyncEnvelope(memories.filter(m => m.status === "active" && !tombstones.includes(m.id)), tombstones);
}
async function readSnapshot(config: GithubSyncConfig) {
  const file = await fetchRemoteFile(config);
  return { sha: file?.sha, snapshot: file ? await parseSyncSnapshot(JSON.parse(decodeBase64(file.content))) : defaultSyncEnvelope([]) };
}
export async function pullGithubSnapshot(config: GithubSyncConfig): Promise<SyncEnvelope> {
  return (await readSnapshot(normalizeGithubConfig(config))).snapshot;
}
export async function pullGithubMemories(config: GithubSyncConfig): Promise<MemoryObject[]> { return (await pullGithubSnapshot(config)).memories; }

export async function pushGithubMemories(config: GithubSyncConfig, memories: MemoryObject[], tombstones: string[] = []): Promise<SyncResult> {
  const normalized = normalizeGithubConfig(config);
  const local = await parseSyncSnapshot(defaultSyncEnvelope(memories, tombstones));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    // The content and SHA must come from the same read. On 409, re-read and merge again.
    const remote = await readSnapshot(normalized);
    const snapshot = mergeSnapshots(local, remote.snapshot);
    let response: Response;
    try {
      response = await fetch(remoteEndpoint(normalized, false), {
        method: "PUT", headers: remoteHeaders(normalized), signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ message: `sync: update Mory memories (${snapshot.memories.length})`,
          content: encodeBase64(JSON.stringify(snapshot, null, 2)), branch: normalized.branch,
          ...(remote.sha ? { sha: remote.sha } : {}), ...(normalized.provider === "gitee" ? { access_token: normalized.token } : {}) }),
      });
    } catch (error) {
      if (attempt === 5) throw error;
      await retryDelay(attempt); continue;
    }
    if (response.ok) return { message: `Synced with ${normalized.provider === "gitee" ? "Gitee" : "GitHub"}.`, uploadedCount: snapshot.memories.length, snapshot };
    const message = await remoteError(response, normalized.provider);
    if (response.status === 409 || response.status === 422) {
      if (attempt === 5) throw new SyncConflictError();
      await retryDelay(attempt); continue;
    }
    if (attempt === 5 || (![408, 429].includes(response.status) && response.status < 500)) throw new Error(message);
    await retryDelay(attempt);
  }
  throw new SyncConflictError();
}
export async function mergeGithubMemories(config: GithubSyncConfig, localMemories: MemoryObject[], localTombstones: string[] = []) {
  const local = await parseSyncSnapshot(defaultSyncEnvelope(localMemories, localTombstones));
  return mergeSnapshots(local, await pullGithubSnapshot(config));
}

async function fetchRemoteFile(config: GithubSyncConfig): Promise<RemoteFileResponse | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(remoteEndpoint(config, true), { headers: remoteHeaders(config), signal: AbortSignal.timeout(30_000) });
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
