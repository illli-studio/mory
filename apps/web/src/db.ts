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
  if (hasMoryApiConfig()) return loadRemoteMemories();
  return db.memories.orderBy("capturedAt").reverse().toArray();
}

export async function saveMemory(memory: MemoryObject): Promise<void> {
  if (hasMoryApiConfig()) {
    await saveRemoteMemory(memory);
    return;
  }
  const existing = await db.memories.where("contentHash").equals(memory.contentHash).first();
  if (existing) {
    throw new Error("This memory already exists in your local repository.");
  }
  await db.memories.add(memory);
}

export async function upsertMemories(memories: MemoryObject[]): Promise<void> {
  if (hasMoryApiConfig()) {
    for (const memory of memories) await saveRemoteMemory(memory);
    return;
  }
  await db.memories.bulkPut(memories);
}

export async function updateMemory(memory: MemoryObject): Promise<void> {
  if (hasMoryApiConfig()) {
    await updateRemoteMemory(memory);
    return;
  }
  await db.memories.put(memory);
}

export async function deleteMemory(id: string): Promise<void> {
  if (hasMoryApiConfig()) {
    await deleteRemoteMemory(id);
    return;
  }
  await db.memories.delete(id);
}

export async function clearMemories(): Promise<void> {
  if (hasMoryApiConfig()) {
    const memories = await loadRemoteMemories();
    for (const memory of memories) await deleteRemoteMemory(memory.id);
    return;
  }
  await db.memories.clear();
}
