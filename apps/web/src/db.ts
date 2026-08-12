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

export async function loadMemories(): Promise<MemoryObject[]> {
  return db.memories.orderBy("capturedAt").reverse().toArray();
}

export async function saveMemory(memory: MemoryObject): Promise<void> {
  const existing = await db.memories.where("contentHash").equals(memory.contentHash).first();
  if (existing) {
    throw new Error("This memory already exists in your local repository.");
  }
  await db.memories.add(memory);
}

export async function upsertMemories(memories: MemoryObject[]): Promise<void> {
  await db.memories.bulkPut(memories);
}

export async function updateMemory(memory: MemoryObject): Promise<void> {
  await db.memories.put(memory);
}

export async function deleteMemory(id: string): Promise<void> {
  await db.memories.delete(id);
}

export async function clearMemories(): Promise<void> {
  await db.memories.clear();
}
