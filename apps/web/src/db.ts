import type { MemoryObject } from "@mory/memory-core";
import Dexie, { type Table } from "dexie";

class MoryDatabase extends Dexie {
  memories!: Table<MemoryObject, string>;

  constructor() {
    super("mory");
    this.version(1).stores({
      memories: "id, contentHash, capturedAt, source, type, *tags",
    });
  }
}

export const db = new MoryDatabase();

type ApiMemory = { id: string; text: string; title: string; kind: string; source: string; tags?: string[]; metadata?: Record<string, unknown>; createdAt: string; updatedAt: string; hash: string; status: string };
let runtime: { apiUrl: string; token: string } | undefined;
let runtimePromise: Promise<typeof runtime> | undefined;

async function getRuntime() {
  if (typeof window === "undefined") return undefined;
  if (!runtimePromise) runtimePromise = fetch("/runtime-config").then((response) => response.ok ? response.json() : undefined).then((value) => { runtime = value; return value; }).catch(() => undefined);
  const current = runtime ?? await runtimePromise;
  if (!current) return undefined;
  return window.location.port === "5173" ? { ...current, apiUrl: window.location.origin } : current;
}
async function hasApiRuntime() {
  const current = await getRuntime();
  // A deployed static build intentionally has no Mory API. In that case the
  // browser database is the local cache and GitHub sync remains the durable
  // store. Keep the API check only as a routing decision, not as a hard
  // requirement, so the same build works on Cloudflare Pages and locally.
  return current;
}
function fromApi(item: ApiMemory): MemoryObject { return { id: item.id, type: "raw", source: ["clipboard", "browser", "file", "chat", "github", "manual"].includes(item.source) ? item.source as MemoryObject["source"] : "manual", capturedAt: item.createdAt, updatedAt: item.updatedAt, contentHash: item.hash, payload: { title: item.title, content: item.text }, kind: item.kind as MemoryObject["kind"], fields: Object.fromEntries(Object.entries(item.metadata || {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))) as MemoryObject["fields"], tags: item.tags || [], score: 50, preview: item.text.slice(0, 180), schemaVersion: 1 }; }
async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> { const current = await hasApiRuntime(); if (!current) throw new Error("Mory API is not available."); const response = await fetch(current.apiUrl + path, { ...init, headers: { authorization: `Bearer ${current.token}`, "content-type": "application/json", ...(init.headers || {}) } }); const result = await response.json(); if (!response.ok) throw new Error(result.error || `Mory API error (${response.status})`); return result as T; }

export async function loadMemories(): Promise<MemoryObject[]> {
  if (await hasApiRuntime()) {
    const result = await apiRequest<{ memories: ApiMemory[] }>("/v1/memories", { method: "GET" });
    if (result.memories.length === 0) {
      // Older web builds stored memories in IndexedDB. Migrate that legacy
      // repository into the API's SQLite store once, without overwriting data
      // that may already exist in SQLite.
      const legacy = await db.memories.toArray();
      for (const memory of legacy) {
        try {
          await saveMemory(memory);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("already exists")) throw error;
        }
      }
      if (legacy.length > 0) {
        const migrated = await apiRequest<{ memories: ApiMemory[] }>("/v1/memories", { method: "GET" });
        return migrated.memories.map(fromApi);
      }
    }
    return result.memories.map(fromApi);
  }
  return db.memories.orderBy("capturedAt").reverse().toArray();
}

export async function saveMemory(memory: MemoryObject): Promise<void> {
  if (await hasApiRuntime()) { const result = await apiRequest<{ memory?: ApiMemory; duplicate?: boolean }>("/v1/memories", { method: "POST", body: JSON.stringify({ id: memory.id, title: memory.payload.title, text: memory.payload.content, kind: memory.kind, source: memory.source, tags: memory.tags, metadata: memory.fields, hash: memory.contentHash, createdAt: memory.capturedAt }) }); if (result.duplicate) throw new Error("This memory already exists in your local repository."); return; }
  const existing = await db.memories.where("contentHash").equals(memory.contentHash).first();
  if (existing) {
    throw new Error("This memory already exists in your local repository.");
  }
  await db.memories.add(memory);
}

export async function upsertMemories(memories: MemoryObject[]): Promise<void> {
  if (await hasApiRuntime()) {
    await apiRequest("/v1/import", {
      method: "POST",
      body: JSON.stringify({
        memories: memories.map((memory) => ({
          id: memory.id,
          title: memory.payload.title,
          text: memory.payload.content,
          kind: memory.kind,
          source: memory.source,
          tags: memory.tags,
          metadata: memory.fields,
          hash: memory.contentHash,
          createdAt: memory.capturedAt,
          updatedAt: memory.updatedAt,
        })),
      }),
    });
    return;
  }
  await db.memories.bulkPut(memories);
}

export async function updateMemory(memory: MemoryObject): Promise<void> {
  if (await hasApiRuntime()) { await apiRequest(`/v1/memories/${encodeURIComponent(memory.id)}`, { method: "PATCH", body: JSON.stringify({ title: memory.payload.title, text: memory.payload.content, kind: memory.kind, source: memory.source, tags: memory.tags, metadata: memory.fields }) }); return; }
  await db.memories.put(memory);
}

export async function deleteMemory(id: string): Promise<void> {
  if (await hasApiRuntime()) { await apiRequest(`/v1/memories/${encodeURIComponent(id)}`, { method: "DELETE" }); return; }
  await db.memories.delete(id);
}

export async function clearMemories(): Promise<void> {
  if (await hasApiRuntime()) { const memories = await loadMemories(); for (const memory of memories) await deleteMemory(memory.id); return; }
  await db.memories.clear();
}
