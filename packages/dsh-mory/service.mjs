import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export class MoryError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = message => { throw new MoryError(400, 'INVALID_INPUT', message); };
const text = (value, name, max = 200_000) => {
  if (typeof value !== 'string' || value.length > max) fail(`${name} must be text (at most ${max} characters).`);
  return value;
};
const integer = (value, fallback, min, max, name) => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < min || result > max) fail(`${name} must be an integer from ${min} to ${max}.`);
  return result;
};
const kinds = ['note', 'chat', 'bill', 'finance', 'task', 'waiting', 'bookmark', 'file', 'decision', 'log'];
export const compact = memory => ({
  id: memory.id, title: (memory.payload?.title ?? memory.title ?? '').slice(0, 160),
  preview: (memory.payload?.content ?? memory.text ?? '').slice(0, 320),
  kind: memory.kind, tags: (memory.tags || []).slice(0, 20).map(tag => tag.slice(0, 128)),
  scope: memory.scope?.projectId ? { projectId: memory.scope.projectId.slice(0, 256) } : {}, isPrivate: memory.isPrivate,
  revision: memory.revision, updatedAt: memory.updatedAt, capturedAt: memory.capturedAt,
  source: memory.source, status: memory.status,
  ...(memory.origin?.deviceName ? { origin: { deviceName: memory.origin.deviceName.slice(0, 128) } } : {}),
});
const full = memory => ({ ...compact(memory), tags: memory.tags || [], payload: memory.payload ?? { title: memory.title, content: memory.text }, source: memory.source, status: memory.status, capturedAt: memory.capturedAt });

// One application service for both the authenticated panel and the agent tool.
export class MoryService {
  constructor(config = {}, dependencies = {}) {
    this.config = config;
    this.env = dependencies.env ?? process.env;
    this.readFile = dependencies.readFile ?? readFile;
    this.fetch = dependencies.fetch ?? globalThis.fetch;
    this.home = dependencies.home ?? homedir();
    this.settings = dependencies.settings;
  }
  async connection(options = {}) {
    const configPath = this.config.configPath || join(this.env.MORY_HOME || join(this.home, '.mory'), 'config.json');
    let local = {};
    try { local = JSON.parse(await this.readFile(configPath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw new MoryError(503, 'CONFIG_INVALID', 'Cannot read Mory configuration. Check config.json on the DSH host.');
    }
    const saved = options.saved ?? await this.settings?.connectionOverrides() ?? {};
    const explicitUrl = this.config.apiUrl || this.env.MORY_API_URL || saved.apiUrl;
    const localOrigin = `http://127.0.0.1:${local.port || 8787}`;
    let url;
    try { url = new URL(explicitUrl || localOrigin); }
    catch { throw new MoryError(503, 'CONFIG_INVALID', 'Mory API URL is invalid.'); }
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (!['http:', 'https:'].includes(url.protocol) || (!loopback && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new MoryError(503, 'CONFIG_INVALID', 'Mory API URL must be an HTTPS origin, or a local HTTP origin, without credentials.');
    }
    // Never forward the local token to a remote service implicitly.
    const token = this.env[this.config.tokenEnv || 'MORY_API_TOKEN'] || (saved.tokenOrigin === url.origin ? saved.token : undefined) || (loopback && url.origin === localOrigin ? local.token : undefined) || '';
    if (options.requireToken !== false && (typeof token !== 'string' || !token.trim())) throw new MoryError(503, 'SETUP_REQUIRED', 'Run mory init and mory start --background on the DSH host, or set MORY_API_URL and MORY_API_TOKEN.');
    return { baseUrl: url.origin, token };
  }
  async request(path, method = 'GET', body, signal, connection) {
    const { baseUrl, token } = connection || await this.connection();
    const requestSignal = AbortSignal.any([AbortSignal.timeout(40_000), ...(signal ? [signal] : [])]);
    let response;
    try {
      response = await this.fetch(baseUrl + path, {
        method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: requestSignal,
        redirect: 'error',
      });
    } catch (error) {
      if (signal?.aborted) throw new MoryError(499, 'ABORTED', 'Request cancelled.');
      throw new MoryError(503, 'UNREACHABLE', 'Cannot reach Mory. Check mory status on the DSH host.');
    }
    let result;
    try {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty response');
      const chunks = []; let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 8 * 1024 * 1024) throw new MoryError(502, 'RESPONSE_TOO_LARGE', 'Mory response is too large. Use a smaller page or query.');
          chunks.push(Buffer.from(value));
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof MoryError) throw error;
      if (signal?.aborted) throw new MoryError(499, 'ABORTED', 'Request cancelled.');
      throw new MoryError(502, 'INVALID_RESPONSE', 'Mory returned an invalid response.');
    }
    if (!response.ok) {
      const code = response.status === 409 ? 'REVISION_CONFLICT' : response.status === 401 ? 'UNAUTHORIZED' : 'MORY_API_ERROR';
      throw new MoryError(response.status, code, response.status === 401 ? 'Mory token is invalid. Check the host configuration.' : String(result.error || `Mory API error (${response.status}).`));
    }
    return result;
  }
  async execute(action, input = {}, signal, actor = { type: 'plugin', id: 'dsh-mory' }) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Input must be an object.');
    const scope = input.projectId ? { projectId: text(input.projectId, 'projectId', 256) } : {};
    const memoryId = () => {
      const id = text(input.memoryId, 'memoryId', 256);
      if (!id.trim() || id === '.' || id === '..') fail('memoryId must be a nonempty memory identifier.');
      return encodeURIComponent(id);
    };
    if (action === 'status') {
      // /health is public in Mory; verify the token against a protected endpoint.
      await this.request('/v1/memories?limit=1&offset=0', 'GET', undefined, signal);
      return { connected: true };
    }
    if (action === 'list') {
      const limit = integer(input.limit, 30, 1, 50, 'limit');
      const offset = integer(input.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset');
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset), ...scope });
      const result = await this.request(`/v1/memories?${params}`, 'GET', undefined, signal);
      return { ...result, memories: result.memories.map(compact) };
    }
    if (action === 'search' || action === 'context') {
      const query = text(input.query, 'query', 4096);
      const limit = integer(input.limit, 10, 1, 50, 'limit');
      const result = await this.request(action === 'context' ? '/v1/context' : '/v1/memories/search', 'POST', { query, scope, limit }, signal);
      if (action === 'search') return { results: result.results.map(item => ({ score: item.score, memory: compact(item.memory) })) };
      const memories = result.memories.map(compact);
      const context = String(result.context || '');
      return { memories, context: context.slice(0, 24_000), truncated: context.length > 24_000 };
    }
    if (action === 'get') {
      const result = await this.request(`/v1/memories/${memoryId()}`, 'GET', undefined, signal);
      return { memory: full(result.memory) };
    }
    if (action === 'create' || action === 'update') {
      const body = {};
      if (input.text !== undefined) body.text = text(input.text, 'text');
      if (input.title !== undefined) body.title = text(input.title, 'title', 4096);
      if (input.kind !== undefined) { if (!kinds.includes(input.kind)) fail('Invalid memory kind.'); body.kind = input.kind; }
      if (input.tags !== undefined) {
        if (!Array.isArray(input.tags) || input.tags.length > 50 || input.tags.some(tag => typeof tag !== 'string' || tag.length > 128)) fail('tags must contain at most 50 short strings.');
        body.tags = input.tags;
      }
      if (input.isPrivate !== undefined) { if (typeof input.isPrivate !== 'boolean') fail('isPrivate must be boolean.'); body.isPrivate = input.isPrivate; }
      if (action === 'create') {
        if (!(body.text || '').trim() && !(body.title || '').trim()) fail('A title or text is required.');
        Object.assign(body, { source: 'dsh', actor, scope });
        if (this.settings) body.origin = await this.settings.deviceOrigin();
      } else {
        body.expectedRevision = integer(input.expectedRevision, undefined, 1, Number.MAX_SAFE_INTEGER, 'expectedRevision');
        if (Object.keys(body).length === 1) fail('Provide a field to update.');
      }
      const result = await this.request(action === 'create' ? '/v1/memories' : `/v1/memories/${memoryId()}`, action === 'create' ? 'POST' : 'PATCH', body, signal);
      if ((action === 'create' && !result.duplicate) || action === 'update') await this.settings?.afterMutation();
      return { ...result, memory: full(result.memory) };
    }
    if (action === 'forget') {
      const revision = integer(input.expectedRevision, undefined, 1, Number.MAX_SAFE_INTEGER, 'expectedRevision');
      const result = await this.request(`/v1/memories/${memoryId()}`, 'DELETE', { expectedRevision: revision }, signal);
      await this.settings?.afterMutation();
      return { ok: result.ok, memoryId: result.memory.id, revision: result.memory.revision };
    }
    fail('Unknown action.');
  }
}
