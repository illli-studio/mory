import type { MemoryObject } from "@mory/memory-core";
import Dexie, { type Table } from "dexie";
import { deleteRemoteMemory, hasMoryApiConfig, loadRemoteMemories, saveRemoteMemory, updateRemoteMemory } from "./mory-api";

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

export async function loadMemories(): Promise<MemoryObject[]> {
  const local = await db.memories.orderBy("capturedAt").reverse().toArray();
  if (!hasMoryApiConfig()) return local;

  try {
    const remote = await loadRemoteMemories();
    const remoteById = new Map(remote.map((memory) => [memory.id, memory]));
    const merged = new Map<string, MemoryObject>();

    for (const memory of local) {
      const remoteMemory = remoteById.get(memory.id);
      // A local edit that has not reached the API yet must not be overwritten on refresh.
      if (!remoteMemory || remoteMemory.contentHash !== memory.contentHash) {
        merged.set(memory.id, memory);
        try {
          if (remoteMemory) await updateRemoteMemory(memory);
          else await saveRemoteMemory(memory);
        } catch {
          // Keep the local copy; a later refresh or explicit sync can retry it.
        }
      } else {
        merged.set(memory.id, remoteMemory);
      }
    }

    // Pull remote-only memories into the local IndexedDB cache.
    for (const memory of remote) {
      if (!merged.has(memory.id)) merged.set(memory.id, memory);
    }
    const result = Array.from(merged.values()).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    await db.memories.bulkPut(result);
    return result;
  } catch {
    // Local-first: an unavailable API must never make the local repository disappear.
    return local;
  }
}

export async function saveMemory(memory: MemoryObject): Promise<void> {
  const existing = await db.memories.where("contentHash").equals(memory.contentHash).first();
  if (existing) {
    throw new Error("This memory already exists in your local repository.");
  }
  await db.memories.add(memory);

  if (hasMoryApiConfig()) {
    try {
      await saveRemoteMemory(memory);
    } catch {
      // Keep the local save durable; the next explicit sync can retry the remote copy.
    }
  }
}

export async function upsertMemories(memories: MemoryObject[]): Promise<void> {
  await db.memories.bulkPut(memories);
  if (hasMoryApiConfig()) {
    for (const memory of memories) {
      try {
        await saveRemoteMemory(memory);
      } catch {
        // Local data remains available when remote sync is unavailable.
      }
    }
  }
}

export async function updateMemory(memory: MemoryObject): Promise<void> {
  await db.memories.put(memory);
  if (hasMoryApiConfig()) {
    try {
      await updateRemoteMemory(memory);
    } catch {
      // Keep the local edit; remote sync can be retried later.
    }
  }
}

export async function deleteMemory(id: string): Promise<void> {
  await db.memories.delete(id);
  if (hasMoryApiConfig()) {
    try {
      await deleteRemoteMemory(id);
    } catch {
      // Keep the local delete; remote sync can be retried later.
    }
  }
}

export async function clearMemories(): Promise<void> {
  await db.memories.clear();
  if (hasMoryApiConfig()) {
    try {
      const memories = await loadRemoteMemories();
      for (const memory of memories) await deleteRemoteMemory(memory.id);
    } catch {
      // Local data is already cleared; a later sync can reconcile the remote copy.
    }
  }
}
