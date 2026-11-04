import * as nativeFs from 'node:fs/promises';
import { homedir, hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { MoryError } from './service.mjs';
import { mergeSnapshots, normalizeMemory } from './protocol.mjs';

export const appearanceIds = ['default', 'midnight', 'ocean', 'sunset', 'forest', 'lavender', 'graphite', 'rose', 'terminal', 'sand', 'cobalt', 'plum', 'mint', 'copper', 'mono', 'abyss', 'ember', 'aurora', 'violet', 'navy', 'crimson', 'sapphire', 'moss', 'solar', 'ink'];
const maxBytes = 8 * 1024 * 1024;
const invalid = message => { throw new MoryError(400, 'INVALID_INPUT', message); };
const object = (value, label) => { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object.`); return value; };
const string = (value, label, max = 256) => { if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f]/u.test(value)) invalid(`${label} must be text without control characters, at most ${max} characters.`); return value.trim(); };
function keys(value, allowed, label) { object(value, label); if (Object.keys(value).some(key => !allowed.includes(key))) invalid(`Unknown ${label} field.`); }
export function validateApiUrl(value) {
  const input = string(value, 'apiUrl', 2048); if (!input) return '';
  let url; try { url = new URL(input); } catch { invalid('Invalid Mory API origin.'); }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (!['http:', 'https:'].includes(url.protocol) || (!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') invalid('Mory API must be an HTTPS origin or a local HTTP origin, without credentials or a path.');
  return url.origin;
}
export function parseRepository(value, provider) {
  const input = string(value, 'repositoryUrl', 2048); if (!input) return null;
  let url; try { url = new URL(input); } catch { invalid('Use an HTTPS GitHub or Gitee repository URL.'); }
  const host = provider === 'gitee' ? 'gitee.com' : 'github.com';
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password || url.search || url.hash) invalid('Repository URL does not match the selected provider.');
  const parts = url.pathname.replace(/\/$/, '').replace(/\.git$/, '').split('/').filter(Boolean);
  if (parts.length !== 2 || parts.some(part => !/^[a-zA-Z0-9_.-]+$/.test(part) || part === '.' || part === '..')) invalid('Repository URL must identify one owner and repository.');
  return { owner: parts[0], repo: parts[1], url: `https://${host}/${parts[0]}/${parts[1]}` };
}
function syncPath(value) {
  const path = string(value, 'sync.path', 1024);
  if (!path || path.startsWith('/') || path.endsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) invalid('Sync path must be a relative file path without traversal.');
  return path;
}
function secret(current, incoming) {
  if (incoming === undefined || incoming === '') return current;
  if (incoming === null) return '';
  const value = string(incoming, 'token', 8192); return value || current;
}
const defaults = () => ({ schemaVersion: 1, revision: 0, appearance: 'default', language: 'auto', connection: { apiUrl: '', token: '', tokenOrigin: '' }, sync: { provider: 'github', repositoryUrl: '', branch: '', path: 'mory/memories.json', deviceName: '', token: '', tokenProvider: '', autoSync: false }, lastSync: null });

export async function parseSyncSnapshot(value) {
  const parsed = Array.isArray(value) ? { memories: value, tombstones: [] } : value;
  try {
    object(parsed, 'snapshot');
    if (parsed.schemaVersion !== undefined && ![1, 2, 3].includes(parsed.schemaVersion)) throw new Error('version');
    if (!Array.isArray(parsed.memories) || parsed.memories.length > 10000 || (parsed.tombstones !== undefined && (!Array.isArray(parsed.tombstones) || parsed.tombstones.length > 100000 || parsed.tombstones.some(id => typeof id !== 'string' || !id || id.length > 256)))) throw new Error('shape');
    if (parsed.memories.some(memory => !memory || typeof memory.id !== 'string' || !memory.id)) throw new Error('identifier');
    const memories = await Promise.all(parsed.memories.map(normalizeMemory));
    const tombstones = [...new Set([...(parsed.tombstones || []), ...memories.filter(memory => memory.status !== 'active').map(memory => memory.id)])];
    return { schemaVersion: 2, exportedAt: new Date().toISOString(), memories: memories.filter(memory => memory.status === 'active' && !tombstones.includes(memory.id)), tombstones };
  } catch { throw new MoryError(400, 'INVALID_SNAPSHOT', 'Invalid or unsupported memory snapshot. Local data was preserved.'); }
}

export class MorySettingsService {
  constructor(config = {}, dependencies = {}) {
    this.config = config;
    this.env = dependencies.env ?? process.env;
    this.home = dependencies.home ?? homedir();
    this.hostname = dependencies.hostname ?? hostname;
    this.fs = { ...nativeFs, ...dependencies.fs };
    this.fetch = dependencies.fetch ?? globalThis.fetch;
    this.setTimeout = dependencies.setTimeout ?? globalThis.setTimeout;
    this.clearTimeout = dependencies.clearTimeout ?? globalThis.clearTimeout;
    this.path = config.settingsPath || join(this.env.MORY_HOME || join(this.home, '.mory'), 'dsh-plugin.json');
    this.timer = null; this.autoController = null; this.syncing = false; this.dirty = false; this.disposed = false; this.lastSync = null;
  }
  attach(service) { this.service = service; }
  async read() {
    let raw;
    try { raw = await this.fs.readFile(this.path, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return defaults(); throw new MoryError(503, 'SETTINGS_IO', 'Cannot read Mory plugin settings.'); }
    try {
      if (Buffer.byteLength(raw) > 64 * 1024) throw new Error('size');
      const value = JSON.parse(raw); object(value, 'settings');
      if (value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !appearanceIds.includes(value.appearance) || !['auto', 'en', 'zh'].includes(value.language)) throw new Error('schema');
      object(value.connection, 'connection'); object(value.sync, 'sync');
      const state = defaults(); Object.assign(state, value);
      state.connection = { ...state.connection, ...value.connection };
      state.sync = { ...defaults().sync, ...value.sync };
      validateApiUrl(state.connection.apiUrl);
      if (typeof state.connection.token !== 'string' || typeof state.connection.tokenOrigin !== 'string' || typeof state.sync.token !== 'string' || !['github', 'gitee'].includes(state.sync.provider) || typeof state.sync.autoSync !== 'boolean') throw new Error('fields');
      parseRepository(state.sync.repositoryUrl, state.sync.provider); syncPath(state.sync.path);
      return state;
    } catch { throw new MoryError(503, 'SETTINGS_INVALID', 'Mory plugin settings are invalid. Repair the plugin settings file before continuing.'); }
  }
  async connectionOverrides() { return (await this.read()).connection; }
  async deviceOrigin() {
    const state = await this.read(); const machine = this.hostname();
    return { deviceId: `dsh-${createHash('sha256').update(`${machine}\u0000${this.path}`).digest('hex').slice(0, 24)}`, deviceName: state.sync.deviceName || machine };
  }
  async safe(state) {
    let effective = { baseUrl: state.connection.apiUrl || 'http://127.0.0.1:8787', token: '' };
    if (this.service) { try { effective = await this.service.connection({ requireToken: false, saved: state.connection }); } catch {} }
    return {
      revision: state.revision, appearance: state.appearance, language: state.language,
      connection: { apiUrl: state.connection.apiUrl, effectiveApiUrl: effective.baseUrl, tokenConfigured: !!effective.token, tokenStored: !!state.connection.token, managedByEnvironment: !!(this.service?.config?.apiUrl || this.service?.env?.MORY_API_URL || this.service?.env?.[this.service?.config?.tokenEnv || 'MORY_API_TOKEN'] || this.config.apiUrl || this.env.MORY_API_URL || this.env[this.config.tokenEnv || 'MORY_API_TOKEN']) },
      sync: { provider: state.sync.provider, repositoryUrl: state.sync.repositoryUrl, branch: state.sync.branch, path: state.sync.path, deviceName: state.sync.deviceName, autoSync: state.sync.autoSync, tokenConfigured: !!state.sync.token && state.sync.tokenProvider === state.sync.provider, tokenStored: !!state.sync.token },
      lastSync: this.lastSync || state.lastSync || null,
    };
  }
  async locked(operation) {
    let lock, temporary;
    try {
      await this.fs.mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      try { lock = await this.fs.open(`${this.path}.lock`, 'wx', 0o600); }
      catch (error) { if (error.code === 'EEXIST') throw new MoryError(409, 'SETTINGS_BUSY', 'Another settings update is in progress. Retry.'); throw error; }
      const state = await this.read(); const next = await operation(state);
      temporary = `${this.path}.${randomUUID()}.tmp`;
      await this.fs.writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      await this.fs.rename(temporary, this.path); temporary = undefined;
      return next;
    } catch (error) { if (error instanceof MoryError) throw error; throw new MoryError(503, 'SETTINGS_IO', 'Cannot save Mory plugin settings.'); }
    finally { if (temporary) await this.fs.unlink(temporary).catch(() => {}); if (lock) { await lock.close().catch(() => {}); await this.fs.unlink(`${this.path}.lock`).catch(() => {}); } }
  }
  async update(input) {
    keys(input, ['expectedRevision', 'appearance', 'language', 'connection', 'sync'], 'settings');
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) invalid('expectedRevision must be the revision returned by settings.get.');
    if (Object.keys(input).length < 2) invalid('Provide a setting to update.');
    const state = await this.locked(async current => {
      if (input.expectedRevision !== current.revision) throw new MoryError(409, 'SETTINGS_CONFLICT', 'Settings changed elsewhere. Reload before saving.');
      const next = structuredClone(current);
      if (input.appearance !== undefined) { if (!appearanceIds.includes(input.appearance)) invalid('Unknown Mory theme.'); next.appearance = input.appearance; }
      if (input.language !== undefined) { if (!['auto', 'en', 'zh'].includes(input.language)) invalid('Language must be auto, en, or zh.'); next.language = input.language; }
      if (input.connection !== undefined) {
        keys(input.connection, ['apiUrl', 'token'], 'connection');
        if (input.connection.apiUrl !== undefined) next.connection.apiUrl = validateApiUrl(input.connection.apiUrl);
        const changedToken = secret(current.connection.token, input.connection.token);
        if (input.connection.token !== undefined && input.connection.token !== '') {
          next.connection.token = changedToken;
          let origin = next.connection.apiUrl;
          if (!origin && changedToken && this.service) origin = (await this.service.connection({ requireToken: false, saved: { ...next.connection, token: '' } })).baseUrl;
          if (!origin && changedToken) invalid('Set apiUrl when saving a connection token.');
          next.connection.tokenOrigin = changedToken ? origin : '';
        }
      }
      if (input.sync !== undefined) {
        keys(input.sync, ['provider', 'repositoryUrl', 'branch', 'path', 'deviceName', 'autoSync', 'token'], 'sync');
        if (input.sync.provider !== undefined) { if (!['github', 'gitee'].includes(input.sync.provider)) invalid('Sync provider must be github or gitee.'); next.sync.provider = input.sync.provider; }
        if (input.sync.repositoryUrl !== undefined) next.sync.repositoryUrl = string(input.sync.repositoryUrl, 'repositoryUrl', 2048);
        const repository = parseRepository(next.sync.repositoryUrl, next.sync.provider); if (repository) next.sync.repositoryUrl = repository.url;
        for (const field of ['branch', 'deviceName']) if (input.sync[field] !== undefined) next.sync[field] = string(input.sync[field], `sync.${field}`);
        if (input.sync.path !== undefined) next.sync.path = syncPath(input.sync.path);
        if (input.sync.autoSync !== undefined) { if (typeof input.sync.autoSync !== 'boolean') invalid('autoSync must be boolean.'); next.sync.autoSync = input.sync.autoSync; }
        // Preserve blank-token semantics, while keeping a saved credential on its original provider.
        next.sync.token = secret(current.sync.token, input.sync.token);
        if (input.sync.token !== undefined && input.sync.token !== '') next.sync.tokenProvider = next.sync.token ? next.sync.provider : '';
      }
      next.revision++;
      return next;
    });
    // Saving settings never starts synchronization.
    if (!state.sync.autoSync && this.timer !== null) { this.clearTimeout(this.timer); this.timer = null; }
    return this.safe(state);
  }
  async remote(url, sync, method = 'GET', body, signal, allow404 = false) {
    const endpoint = new URL(url);
    if (sync.provider === 'gitee' && method === 'GET') endpoint.searchParams.set('access_token', sync.token);
    const headers = { Accept: sync.provider === 'gitee' ? 'application/json' : 'application/vnd.github+json', Authorization: `${sync.provider === 'gitee' ? 'token' : 'Bearer'} ${sync.token}`, 'content-type': 'application/json', ...(sync.provider === 'github' ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) };
    const serialized = body === undefined ? undefined : JSON.stringify(body);
    if (serialized && Buffer.byteLength(serialized) > maxBytes) throw new MoryError(413, 'SNAPSHOT_TOO_LARGE', 'The sync snapshot exceeds the 8 MiB request limit.');
    let response;
    try { response = await this.fetch(endpoint.href, { method, headers, body: serialized, redirect: 'error', signal: AbortSignal.any([AbortSignal.timeout(40_000), ...(signal ? [signal] : [])]) }); }
    catch { throw new MoryError(signal?.aborted ? 499 : 503, signal?.aborted ? 'ABORTED' : 'REMOTE_UNREACHABLE', signal?.aborted ? 'Sync cancelled.' : 'Cannot reach the repository provider. A failed upload may have completed remotely; check before retrying.'); }
    if (response.status === 404 && allow404) { await response.body?.cancel().catch(() => {}); return null; }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      const error = new MoryError(response.status, response.status === 409 || response.status === 422 ? 'REMOTE_CONFLICT' : 'REMOTE_ERROR', `Repository provider request failed (${response.status}). Check its token, permissions, branch, and repository.`);
      throw error;
    }
    // A successful mutation is committed even if its unused response body is empty or malformed.
    if (method !== 'GET') { await response.body?.cancel().catch(() => {}); return { committed: true }; }
    const reader = response.body?.getReader(); if (!reader) throw new MoryError(502, 'INVALID_RESPONSE', 'Repository provider returned an empty response.');
    const chunks = []; let size = 0;
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) throw new MoryError(502, 'RESPONSE_TOO_LARGE', 'Repository provider response exceeds 8 MiB.'); chunks.push(Buffer.from(value)); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof MoryError) throw error;
      if (signal?.aborted) throw new MoryError(499, 'ABORTED', 'Sync cancelled.');
      throw new MoryError(502, 'INVALID_RESPONSE', 'Repository provider returned an invalid response.');
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  async repository(sync, signal) {
    const parsed = parseRepository(sync.repositoryUrl, sync.provider);
    if (!parsed || !sync.token || sync.tokenProvider !== sync.provider) throw new MoryError(400, 'SYNC_SETUP_REQUIRED', 'Save a repository URL and a token for the selected provider before checking or syncing.');
    const base = sync.provider === 'gitee' ? 'https://gitee.com/api/v5' : 'https://api.github.com';
    const endpoint = `${base}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
    const info = await this.remote(endpoint, sync, 'GET', undefined, signal);
    if (info.private !== true) throw new MoryError(400, 'PRIVATE_REPOSITORY_REQUIRED', 'Use a private repository: synchronization includes private memories and deletion records.');
    const branch = string(sync.branch || info.default_branch || 'main', 'branch');
    return { endpoint, branch, parsed };
  }
  async remoteSnapshot(sync, repository, signal) {
    const endpoint = `${repository.endpoint}/contents/${sync.path.split('/').map(encodeURIComponent).join('/')}`;
    const readUrl = new URL(endpoint); readUrl.searchParams.set('ref', repository.branch);
    const file = await this.remote(readUrl.href, sync, 'GET', undefined, signal, true);
    if (file === null) return { endpoint, sha: undefined, exists: false, snapshot: { schemaVersion: 2, memories: [], tombstones: [] } };
    if (file.encoding !== 'base64' || typeof file.content !== 'string' || typeof file.sha !== 'string' || !file.sha || !/^[A-Za-z0-9+/=\s]*$/.test(file.content)) throw new MoryError(502, 'INVALID_SNAPSHOT', 'Repository file is not a supported base64 memory snapshot.');
    let decoded; try { decoded = JSON.parse(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8')); } catch { throw new MoryError(400, 'INVALID_SNAPSHOT', 'Repository file does not contain valid memory JSON.'); }
    return { endpoint, sha: file.sha, exists: true, snapshot: await parseSyncSnapshot(decoded) };
  }
  async health(signal) {
    if (!this.service) throw new MoryError(503, 'UNAVAILABLE', 'Mory service is unavailable.');
    try {
      const connection = await this.service.connection();
      const response = await this.service.request('/v1/memories?limit=1&offset=0', 'GET', undefined, signal, connection);
      return { connected: true, apiUrl: connection.baseUrl, total: response.total, storage: 'mory-api', settingsRevision: (await this.read()).revision };
    } catch (error) { throw new MoryError(error.status || 503, error.code || 'UNREACHABLE', 'Unable to connect to the configured Mory service. Check the API origin, token and running service.'); }
  }
  async saveStatus(status) {
    this.lastSync = status;
    try { await this.locked(state => ({ ...state, lastSync: status })); }
    catch { this.lastSync = { ...status, statusPersisted: false }; }
  }
  async synchronize(mode, signal) {
    if (!['pull', 'push', 'merge'].includes(mode)) invalid('Sync mode must be pull, push, or merge.');
    if (this.syncing) throw new MoryError(409, 'SYNC_BUSY', 'Another synchronization is in progress.');
    if (!this.service) throw new MoryError(503, 'UNAVAILABLE', 'Mory service is unavailable.');
    signal = AbortSignal.any([AbortSignal.timeout(180_000), ...(signal ? [signal] : [])]);
    this.syncing = true;
    if (this.timer !== null) { this.clearTimeout(this.timer); this.timer = null; }
    const startedAt = new Date().toISOString(); let remoteCommitted = false; let sync;
    try {
      const state = await this.read(); sync = state.sync;
      this.lastSync = { status: 'running', mode, startedAt };
      const repository = await this.repository(sync, signal);
      const connection = await this.service.connection();
      const base = await this.service.request('/v1/snapshot', 'GET', undefined, signal, connection);
      if (!Number.isSafeInteger(base.generation) || base.generation < 0) throw new MoryError(502, 'INVALID_RESPONSE', 'Mory returned an invalid repository generation.');
      const local = await parseSyncSnapshot(base);
      let snapshot, exists, retries = 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        const remote = await this.remoteSnapshot(sync, repository, signal); exists = remote.exists;
        snapshot = mergeSnapshots(local, remote.snapshot);
        if (mode === 'pull') break;
        const content = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8').toString('base64');
        const body = { message: `sync: update Mory memories (${snapshot.memories.length})`, branch: repository.branch, content, ...(remote.sha ? { sha: remote.sha } : {}), ...(sync.provider === 'gitee' ? { access_token: sync.token } : {}) };
        try { await this.remote(remote.endpoint, sync, sync.provider === 'gitee' && !remote.sha ? 'POST' : 'PUT', body, signal); remoteCommitted = true; break; }
        catch (error) { if (error.code !== 'REMOTE_CONFLICT' || attempt === 3) throw error; retries++; }
      }
      let localApplied = false;
      try {
        await this.service.request('/v1/sync', 'POST', { memories: snapshot.memories, tombstones: snapshot.tombstones, expectedGeneration: base.generation }, signal, connection);
        localApplied = true;
      } catch (error) {
        if (!remoteCommitted) throw error;
        const result = { ok: false, status: 'partial', mode, remoteCommitted: true, localApplied: false, code: error.code || 'LOCAL_SYNC_FAILED', message: 'The remote snapshot was committed, but local data changed or could not be updated. Local data was preserved; pull or merge again.', startedAt, finishedAt: new Date().toISOString() };
        await this.saveStatus(result); return result;
      }
      const result = { ok: true, status: 'success', mode, provider: sync.provider, branch: repository.branch, remoteCommitted, localApplied, remoteExists: exists, memories: snapshot.memories.length, tombstones: snapshot.tombstones.length, retries, startedAt, finishedAt: new Date().toISOString() };
      await this.saveStatus(result); return result;
    } catch (error) {
      const known = error instanceof MoryError;
      const failure = new MoryError(known ? error.status : 503, known ? error.code : 'SYNC_FAILED', known && !['MORY_API_ERROR', 'REVISION_CONFLICT'].includes(error.code) ? error.message : 'Synchronization failed. Local data was preserved.');
      await this.saveStatus({ ok: false, status: 'error', mode, remoteCommitted, localApplied: false, code: failure.code, message: failure.message, startedAt, finishedAt: new Date().toISOString() });
      throw failure;
    } finally {
      this.syncing = false;
      if (this.dirty && !this.disposed) { this.dirty = false; await this.afterMutation(); }
    }
  }
  async afterMutation() {
    if (this.disposed) return;
    let state;
    try { state = await this.read(); } catch { return; }
    if (!state.sync.autoSync) return;
    if (this.syncing) { this.dirty = true; return; }
    if (this.timer !== null) this.clearTimeout(this.timer);
    this.timer = this.setTimeout(async () => {
      this.timer = null;
      if (this.disposed) return;
      try { if (!(await this.read()).sync.autoSync) return; this.autoController = new AbortController(); await this.synchronize('merge', this.autoController.signal); }
      catch { /* synchronize records a sanitized status for the Settings page. */ }
      finally { this.autoController = null; }
    }, 5000);
    this.timer?.unref?.();
  }
  dispose() { this.disposed = true; this.dirty = false; if (this.timer !== null) this.clearTimeout(this.timer); this.timer = null; this.autoController?.abort(); }
  async execute(action, input = {}, signal) {
    object(input, 'settings input');
    if (action === 'get') return this.safe(await this.read());
    if (action === 'update') return this.update(input);
    if (action === 'health') return this.health(signal);
    if (action === 'check') {
      if (input.target === 'mory') return this.health(signal);
      if (input.target !== 'sync') invalid('Check target must be mory or sync.');
      const state = await this.read(); const repository = await this.repository(state.sync, signal);
      return { connected: true, provider: state.sync.provider, repositoryUrl: repository.parsed.url, branch: repository.branch, private: true };
    }
    if (action === 'sync') return this.synchronize(input.mode, signal);
    invalid('Unknown settings action.');
  }
}
