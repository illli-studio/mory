import type { MemoryObject } from "./src/index.js";
export function stableJson(value: unknown): string;
export function memoryFingerprint(memory: MemoryObject): string;
export function normalizeMemory(input: unknown): Promise<MemoryObject>;
export interface MemorySnapshot { schemaVersion?: number; exportedAt?: string; memories: MemoryObject[]; tombstones: string[]; }
export function mergeSnapshots(local: MemorySnapshot, remote: MemorySnapshot): MemorySnapshot & { schemaVersion: 2; exportedAt: string };
