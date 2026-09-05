export class MoryClient {
    baseUrl;
    token;
    constructor(options = {}) { this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:8787").replace(/\/$/, ""); this.token = options.token ?? ""; }
    async request(path, init = {}) { const response = await fetch(this.baseUrl + path, { ...init, headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", ...(init.headers || {}) } }); const result = await response.json(); if (!response.ok)
        throw new Error(result.error || `Mory API error (${response.status})`); return result; }
    remember(input) { return this.request("/v1/memories/remember", { method: "POST", body: JSON.stringify({ ...input, source: input.source ?? "sdk", actor: { type: "agent", id: "sdk" }, scope: input.projectId ? { projectId: input.projectId } : {} }) }); }
    search(query, options = {}) { return this.request("/v1/memories/search", { method: "POST", body: JSON.stringify({ query, limit: options.limit ?? 10, scope: options.projectId ? { projectId: options.projectId } : {} }) }); }
    context(query, options = {}) { return this.request("/v1/context", { method: "POST", body: JSON.stringify({ query, limit: options.limit ?? 12, scope: options.projectId ? { projectId: options.projectId } : {} }) }); }
    list(options = {}) { const params = new URLSearchParams({ limit: String(options.limit ?? 50) }); if (options.projectId)
        params.set("projectId", options.projectId); return this.request(`/v1/memories?${params}`, { method: "GET" }); }
    export() { return this.request("/v1/export", { method: "GET" }); }
    import(memories) { return this.request("/v1/import", { method: "POST", body: JSON.stringify({ memories }) }); }
    get(id) { return this.request(`/v1/memories/${encodeURIComponent(id)}`, { method: "GET" }); }
    update(id, input) { return this.request(`/v1/memories/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
    forget(id) { return this.request(`/v1/memories/${encodeURIComponent(id)}`, { method: "DELETE" }); }
}
