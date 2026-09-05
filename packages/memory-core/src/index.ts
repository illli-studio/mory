export type MemoryType = "raw" | "preview" | "snapshot" | "relation";
export type MemoryKind =
  | "note"
  | "chat"
  | "bill"
  | "finance"
  | "task"
  | "waiting"
  | "bookmark"
  | "file"
  | "decision"
  | "log";
export type MemoryFields = Record<string, string | number | boolean | undefined>;

export type MemorySource =
  | "manual"
  | "clipboard"
  | "browser"
  | "file"
  | "chat"
  | "github";

export interface MemoryOrigin {
  deviceId: string;
  deviceName: string;
}

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
  updatedAt?: string;
  contentHash: string;
  payload: MemoryPayload;
  kind?: MemoryKind;
  fields?: MemoryFields;
  tags: string[];
  score: number;
  preview?: string;
  /** @deprecated Use preview. Kept only for older local exports. */
  summary?: string;
  isPrivate?: boolean;
  parentIds?: string[];
  schemaVersion: number;
  actor?: { type: "human" | "agent" | "ai" | "plugin"; id?: string };
  origin?: MemoryOrigin;
}

export interface CreateMemoryInput {
  title: string;
  content: string;
  source?: MemorySource;
  type?: MemoryType;
  kind?: MemoryKind;
  fields?: MemoryFields;
  url?: string;
  tags?: string[];
  capturedAt?: string;
  isPrivate?: boolean;
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

export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(/https?:\/\/[^\s<>"')]+/gi) ?? []));
}

export function createPreview(text: string, maxLength = 180): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentence = normalized.match(/^.{40,}?[.!?]/u)?.[0];
  const preview = sentence && sentence.length <= maxLength ? sentence : normalized.slice(0, maxLength - 3);
  return `${preview.trim()}...`;
}

export const summarizeText = createPreview;

export function domainTag(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".").slice(0, -1).join("-") || undefined;
  } catch {
    return undefined;
  }
}

export async function createMemory(input: CreateMemoryInput): Promise<MemoryObject> {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const source = input.source ?? "manual";
  const type = input.type ?? "raw";
  const kind = input.kind ?? inferKind(input);
  const title = input.title.trim() || input.content.trim().slice(0, 72) || "Untitled memory";
  const content = input.content.trim();
  const detectedUrl = input.url?.trim() || extractUrls(`${title} ${content}`)[0];
  const fields = cleanFields(input.fields ?? {});
  const contentHash = await sha256(JSON.stringify({ source, kind, title, content, url: detectedUrl ?? "", fields }));

  return {
    id: crypto.randomUUID(),
    type,
    source,
    capturedAt,
    updatedAt: capturedAt,
    contentHash,
    payload: {
      title,
      content,
      url: detectedUrl || undefined,
    },
    kind,
    fields,
    // Tags are explicit user metadata. Do not infer them from the record kind,
    // source, URL, title, or content.
    tags: normalizeTags(input.tags ?? []),
    score: Math.min(100, Math.max(1, Math.round(content.length / 12) + 20)),
    preview: createPreview(content),
    isPrivate: input.isPrivate ?? false,
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
    memory.kind ?? "",
    ...Object.values(memory.fields ?? {}).map(String),
    memory.preview ?? "",
    memory.summary ?? "",
    memory.isPrivate ? "private" : "",
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

function inferKind(input: CreateMemoryInput): MemoryKind {
  if (input.url || extractUrls(`${input.title} ${input.content}`)[0]) {
    return "bookmark";
  }

  return input.source === "chat" ? "chat" : "note";
}

function cleanFields(fields: MemoryFields): MemoryFields {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && `${value}`.trim() !== ""));
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
    preview: 0,
    snapshot: 0,
    relation: 0,
  };
}
