export type MemoryType = "raw" | "summary" | "embedding" | "snapshot" | "relation";

export type MemorySource =
  | "manual"
  | "clipboard"
  | "browser"
  | "file"
  | "chat"
  | "github";

export interface MemoryPayload {
  title: string;
  content: string;
  url?: string;
}

export interface MemoryObject {
  id: string;
  type: MemoryType;
  source: MemorySource;
  capturedAt: string;
  contentHash: string;
  payload: MemoryPayload;
  tags: string[];
  score: number;
  parentIds?: string[];
  schemaVersion: number;
}

export interface CreateMemoryInput {
  title: string;
  content: string;
  source?: MemorySource;
  type?: MemoryType;
  url?: string;
  tags?: string[];
  capturedAt?: string;
}

export interface MemoryStats {
  total: number;
  sources: Record<MemorySource, number>;
  types: Record<MemoryType, number>;
  tags: Array<{ tag: string; count: number }>;
  today: number;
}

const textEncoder = new TextEncoder();

export async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(text));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

export function suggestTags(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && word.length <= 24);

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([word]) => word);
}

export async function createMemory(input: CreateMemoryInput): Promise<MemoryObject> {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const source = input.source ?? "manual";
  const type = input.type ?? "raw";
  const title = input.title.trim() || input.content.trim().slice(0, 72) || "Untitled memory";
  const content = input.content.trim();
  const contentHash = await sha256(JSON.stringify({ source, title, content, url: input.url ?? "" }));
  const suggestedTags = suggestTags(`${title} ${content}`);

  return {
    id: crypto.randomUUID(),
    type,
    source,
    capturedAt,
    contentHash,
    payload: {
      title,
      content,
      url: input.url?.trim() || undefined,
    },
    tags: normalizeTags([...(input.tags ?? []), ...suggestedTags]),
    score: Math.min(100, Math.max(1, Math.round(content.length / 12) + 20)),
    schemaVersion: 1,
  };
}

export function matchesMemory(memory: MemoryObject, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    memory.payload.title,
    memory.payload.content,
    memory.payload.url ?? "",
    memory.source,
    memory.type,
    ...memory.tags,
  ]
    .join(" ")
    .toLowerCase();

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function computeStats(memories: MemoryObject[], now = new Date()): MemoryStats {
  const todayKey = now.toISOString().slice(0, 10);
  const sources = emptySourceCounts();
  const types = emptyTypeCounts();
  const tagCounts = new Map<string, number>();

  for (const memory of memories) {
    sources[memory.source] += 1;
    types[memory.type] += 1;
    for (const tag of memory.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    total: memories.length,
    sources,
    types,
    today: memories.filter((memory) => memory.capturedAt.slice(0, 10) === todayKey).length,
    tags: Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count })),
  };
}

function emptySourceCounts(): Record<MemorySource, number> {
  return {
    manual: 0,
    clipboard: 0,
    browser: 0,
    file: 0,
    chat: 0,
    github: 0,
  };
}

function emptyTypeCounts(): Record<MemoryType, number> {
  return {
    raw: 0,
    summary: 0,
    embedding: 0,
    snapshot: 0,
    relation: 0,
  };
}
