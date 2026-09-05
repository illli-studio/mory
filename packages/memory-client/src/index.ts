export interface MoryClientOptions { baseUrl?: string; token?: string; }
export interface RememberInput { text: string; projectId?: string; kind?: string; metadata?: Record<string, unknown>; source?: string; }

export class MoryClient {
  readonly baseUrl: string;
  readonly token: string;
  constructor(options: MoryClientOptions = {}) { this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:8787").replace(/\/$/, ""); this.token = options.token ?? ""; }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> { const response = await fetch(this.baseUrl + path, { ...init, headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", ...(init.headers || {}) } }); const result = await response.json() as T & { error?: string }; if (!response.ok) throw new Error(result.error || `Mory API error (${response.status})`); return result; }
  remember(input: RememberInput) { return this.request<Record<string, unknown>>("/v1/memories/remember", { method: "POST", body: JSON.stringify({ ...input, source: input.source ?? "sdk", actor: { type: "agent", id: "sdk" }, scope: input.projectId ? { projectId: input.projectId } : {} }) }); }
  search(query: string, options: { projectId?: string; limit?: number } = {}) { return this.request<Record<string, unknown>>("/v1/memories/search", { method: "POST", body: JSON.stringify({ query, limit: options.limit ?? 10, scope: options.projectId ? { projectId: options.projectId } : {} }) }); }
  context(query: string, options: { projectId?: string; limit?: number } = {}) { return this.request<{ context: string; memories: unknown[] }>("/v1/context", { method: "POST", body: JSON.stringify({ query, limit: options.limit ?? 12, scope: options.projectId ? { projectId: options.projectId } : {} }) }); }
  list(options: { projectId?: string; limit?: number } = {}) { const params = new URLSearchParams({ limit: String(options.limit ?? 50) }); if (options.projectId) params.set("projectId", options.projectId); return this.request<{ memories: unknown[]; total: number }>(`/v1/memories?${params}`, { method: "GET" }); }
  export() { return this.request<{ schemaVersion: number; exportedAt: string; memories: unknown[] }>("/v1/export", { method: "GET" }); }
  import(memories: unknown[]) { return this.request<{ addedCount: number; duplicateCount: number }>("/v1/import", { method: "POST", body: JSON.stringify({ memories }) }); }
  get(id: string) { return this.request<Record<string, unknown>>(`/v1/memories/${encodeURIComponent(id)}`, { method: "GET" }); }
  update(id: string, input: Partial<RememberInput> & { title?: string; tags?: string[] }) { return this.request<Record<string, unknown>>(`/v1/memories/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  forget(id: string) { return this.request<{ ok: boolean }>(`/v1/memories/${encodeURIComponent(id)}`, { method: "DELETE" }); }
}
