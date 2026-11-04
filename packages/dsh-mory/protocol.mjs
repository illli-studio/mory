const kinds = new Set(["note", "chat", "bill", "finance", "task", "waiting", "bookmark", "file", "decision", "log"]);
const types = new Set(["raw", "preview", "snapshot", "relation"]);
const statuses = new Set(["active", "deleted", "superseded"]);
function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}
function timestamp(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("Invalid timestamp.");
  return new Date(value).toISOString();
}
function strings(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(v => typeof v !== "string")) throw new Error(`${label} must be a string array.`);
  return [...new Set(value.map(v => v.trim()).filter(Boolean))];
}
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function memoryFingerprint(memory) {
  return stableJson({source:memory.source,type:memory.type,kind:memory.kind,payload:memory.payload,
    fields:memory.fields || {},metadata:memory.metadata || {},tags:[...memory.tags].sort(),
    isPrivate:Boolean(memory.isPrivate),scope:memory.scope || {},status:memory.status || "active"});
}
export async function normalizeMemory(input) {
  record(input,"Memory");
  const payload = input.payload === undefined ? {} : record(input.payload,"Payload");
  const content = payload.content ?? input.text ?? input.content ?? "";
  const title = payload.title ?? input.title ?? (typeof content === "string" ? content.slice(0,72) : "");
  if (typeof content !== "string" || typeof title !== "string" || (!content.trim() && !title.trim())) throw new Error("Memory needs a title or content.");
  if (content.length > 1_000_000 || title.length > 4096) throw new Error("Memory exceeds size limit.");
  const id = input.id ?? crypto.randomUUID();
  if (typeof id !== "string" || !id.trim() || id.length > 256) throw new Error("Invalid memory id.");
  const source = input.source ?? "manual";
  if (typeof source !== "string" || !source.trim()) throw new Error("Invalid source.");
  const kind = input.kind ?? "note", type = input.type ?? "raw", status = input.status ?? "active";
  if (!kinds.has(kind) || !types.has(type) || !statuses.has(status)) throw new Error("Invalid kind, type or status.");
  const metadata = record(input.metadata ?? input.fields ?? {},"Metadata");
  const fields = record(input.fields ?? Object.fromEntries(Object.entries(metadata).filter(([,v]) => ["string","number","boolean"].includes(typeof v))),"Fields");
  if (Object.values(fields).some(v => v !== undefined && !["string","number","boolean"].includes(typeof v))) throw new Error("Fields must contain scalar values.");
  const scope = record(input.scope ?? {},"Scope");
  if (Object.values(scope).some(v => typeof v !== "string")) throw new Error("Scope values must be strings.");
  const now = new Date().toISOString();
  const capturedAt = timestamp(input.capturedAt ?? input.createdAt,now);
  const revision = input.revision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid revision.");
  if (input.isPrivate !== undefined && typeof input.isPrivate !== "boolean") throw new Error("Invalid privacy flag.");
  const url = payload.url ?? input.url;
  if (url !== undefined && (typeof url !== "string" || !/^https?:\/\//i.test(url))) throw new Error("URL must use http or https.");
  const actor = input.actor ?? {type:"human"};
  if (!actor || !["human","agent","ai","plugin"].includes(actor.type) || (actor.id !== undefined && typeof actor.id !== "string")) throw new Error("Invalid actor.");
  const origin = input.origin;
  if (origin !== undefined && (!origin || typeof origin.deviceId !== "string" || typeof origin.deviceName !== "string")) throw new Error("Invalid device origin.");
  const embedding = input.embedding;
  if (embedding != null && (!Array.isArray(embedding) || embedding.some(v => typeof v !== "number" || !Number.isFinite(v)))) throw new Error("Invalid embedding.");
  const memory = {id,source,type,kind,status,revision,capturedAt,updatedAt:timestamp(input.updatedAt,capturedAt),
    payload:{title:title.trim() || "Untitled memory",content:content.trim(),...(url ? {url} : {})},
    fields,metadata,tags:strings(input.tags,"Tags").map(v => v.replace(/^#/,"").toLowerCase()),
    isPrivate:input.isPrivate ?? false,score:Number.isFinite(input.score) ? input.score : 50,
    preview:content.trim().replace(/\s+/g," ").slice(0,180),schemaVersion:2,actor,
    ...(origin ? {origin} : {}),scope,sourceEventIds:strings(input.sourceEventIds,"Source event ids"),
    ...(input.parentIds ? {parentIds:strings(input.parentIds,"Parent ids")} : {}),...(embedding ? {embedding} : {})};
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(memoryFingerprint(memory)));
  return {...memory,contentHash:Array.from(new Uint8Array(digest),v => v.toString(16).padStart(2,"0")).join("")};
}
export function mergeSnapshots(local, remote) {
  const tombstones = new Set([...local.tombstones,...remote.tombstones]);
  const byId = new Map();
  for (const memory of [...remote.memories,...local.memories]) {
    if (tombstones.has(memory.id)) continue;
    const existing = byId.get(memory.id);
    if (!existing || memoryFingerprint(existing) === memoryFingerprint(memory)) {
      byId.set(memory.id,!existing || (memory.updatedAt ?? memory.capturedAt) > (existing.updatedAt ?? existing.capturedAt) ? memory : existing);
      continue;
    }
    // Keep both divergent versions under deterministic ids, including on retries.
    const a = `${existing.updatedAt ?? existing.capturedAt}:${memoryFingerprint(existing)}`;
    const b = `${memory.updatedAt ?? memory.capturedAt}:${memoryFingerprint(memory)}`;
    const [winner,other] = a >= b ? [existing,memory] : [memory,existing];
    byId.set(memory.id,winner);
    const copyId = `${memory.id.slice(0,160)}~conflict~${other.contentHash.slice(0,64)}`;
    if (!tombstones.has(copyId)) byId.set(copyId,{...other,id:copyId,revision:0,parentIds:[...new Set([...(other.parentIds || []),memory.id])]});
  }
  return {schemaVersion:2,exportedAt:new Date().toISOString(),memories:[...byId.values()].sort((a,b) => b.capturedAt.localeCompare(a.capturedAt)),tombstones:[...tombstones].sort()};
}
