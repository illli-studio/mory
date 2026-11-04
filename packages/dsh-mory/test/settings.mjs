import test from 'node:test';
import assert from 'node:assert/strict';
import { MorySettingsService, appearanceIds, parseSyncSnapshot } from '../settings.mjs';
import { MoryService, MoryError } from '../service.mjs';
import { normalizeMemory, mergeSnapshots } from '../protocol.mjs';
import { apply } from '../index.js';

const json = (value, status = 200) => Response.json(value, { status });
const error = (code, status) => value => { assert.ok(value instanceof MoryError); assert.equal(value.code, code); if (status !== undefined) assert.equal(value.status, status); return true; };
function missing() { return Object.assign(new Error('missing'), { code: 'ENOENT' }); }
function filesystem() {
  const files = new Map(), writes = [];
  return { files, writes,
    async mkdir() {},
    async readFile(path) { if (!files.has(path)) throw missing(); return files.get(path); },
    async open(path) { if (files.has(path)) throw Object.assign(new Error('locked'), { code: 'EEXIST' }); files.set(path, ''); return { async close() {} }; },
    async writeFile(path, data, options) { if (options?.flag === 'wx' && files.has(path)) throw new Error('exists'); files.set(path, data); writes.push({ path, data, options }); },
    async rename(from, to) { if (!files.has(from)) throw missing(); files.set(to, files.get(from)); files.delete(from); },
    async unlink(path) { files.delete(path); },
  };
}
function create(options = {}) {
  const fs = options.fs || filesystem();
  const settings = new MorySettingsService(options.config || {}, { env: {}, home: '/settings-test-home', fs, ...options.dependencies });
  return { settings, fs };
}
async function memory(id, text = id, fields = {}) { return normalizeMemory({ id, text, title: id, capturedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...fields }); }
function attachConnection(settings, options = {}) {
  const service = new MoryService(options.config || {}, { settings, env: options.env || {}, home: '/settings-test-home', readFile: async () => '{"port":8787,"token":"local-memory-secret"}', fetch: options.fetch || (async () => json({ memories: [], total: 0, nextOffset: null })) });
  settings.attach(service); return service;
}
async function configured(options = {}) {
  const result = create(options);
  await result.settings.update({ expectedRevision: 0, sync: { provider: options.provider || 'github', repositoryUrl: options.provider === 'gitee' ? 'https://gitee.com/user/memory' : 'https://github.com/user/memory', token: 'provider-secret', ...options.sync } });
  return result;
}
async function syncFixture(options = {}) {
  const local = { generation: 1, memories: options.local || [await memory('local')], tombstones: options.localTombstones || [] };
  let remote = { schemaVersion: 2, memories: options.remote || [await memory('remote')], tombstones: options.remoteTombstones || [] };
  let sha = options.missingFile ? undefined : 'sha-1'; let writes = 0, localWrites = 0; const requests = [];
  const fetch = async (url, init) => {
    const parsed = new URL(url); requests.push({ url: parsed, init });
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    if (!parsed.pathname.includes('/contents/')) return json({ private: options.private !== false, default_branch: 'main' });
    if (init.method === 'GET') {
      if (options.invalidRemote) return json({ encoding: 'base64', sha: 'sha-1', content: Buffer.from('{bad json').toString('base64') });
      return sha ? json({ encoding: 'base64', sha, content: Buffer.from(JSON.stringify(remote)).toString('base64') }) : json({ message: 'not found' }, 404);
    }
    const body = JSON.parse(init.body); writes++;
    if (options.alwaysConflict) return json({ message: 'conflict provider-secret' }, 422);
    if (options.conflict && writes === 1) {
      remote.memories.push(await memory('concurrent-remote'));
      sha = 'sha-2'; return json({ message: 'conflict' }, 409);
    }
    assert.equal(body.sha, sha);
    remote = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    sha = `sha-${writes + 2}`;
    if (options.localConflict) { local.generation++; local.memories.push(await memory('concurrent-local')); }
    return options.emptySuccess ? new Response(null, { status: 204 }) : json({ content: { sha } }, 201);
  };
  const result = await configured({ provider: options.provider, sync: options.sync, dependencies: { fetch } });
  const service = {
    async connection() { return { baseUrl: 'http://127.0.0.1:8787', token: 'local-secret' }; },
    async request(path, method, body, signal, pinned) {
      assert.equal(pinned.baseUrl, 'http://127.0.0.1:8787');
      if (path === '/v1/snapshot') return structuredClone(local);
      assert.equal(path, '/v1/sync'); assert.equal(method, 'POST'); localWrites++;
      if (body.expectedGeneration !== local.generation) throw new MoryError(409, 'REVISION_CONFLICT', 'Changed.');
      const merged = mergeSnapshots(local, body); local.memories = merged.memories; local.tombstones = merged.tombstones; local.generation++;
      return structuredClone(local);
    },
  };
  result.settings.attach(service);
  return { ...result, local, requests, remote: () => remote, writes: () => writes, localWrites: () => localWrites };
}

test('settings defaults are complete, redacted, and do not create a configuration file', async () => {
  const { settings, fs } = create(); const value = await settings.execute('get');
  assert.equal(value.revision, 0); assert.equal(value.appearance, 'default'); assert.equal(value.language, 'auto');
  assert.equal(value.connection.tokenConfigured, false); assert.equal(value.sync.tokenConfigured, false);
  assert.equal(value.sync.path, 'mory/memories.json'); assert.equal(value.sync.autoSync, false);
  assert.equal(fs.files.size, 0); assert.equal(value.lastSync, null); assert.equal(appearanceIds.length, 25);
});

test('settings updates persist atomically with mode600, and blank secrets preserve while null clears', async () => {
  const { settings, fs } = create(); attachConnection(settings);
  let value = await settings.update({ expectedRevision: 0, appearance: 'ocean', language: 'zh', connection: { apiUrl: 'https://memory.example', token: 'memory-secret' }, sync: { repositoryUrl: 'https://github.com/user/memory.git', token: 'provider-secret', deviceName: 'Desktop', autoSync: true } });
  assert.equal(value.revision, 1); assert.equal(value.connection.tokenConfigured, true); assert.equal(value.sync.tokenConfigured, true);
  assert.doesNotMatch(JSON.stringify(value), /memory-secret|provider-secret/);
  assert.equal(fs.writes[0].options.mode, 0o600); assert.equal(fs.files.size, 1);
  value = await settings.update({ expectedRevision: 1, connection: { token: '' }, sync: { token: '' } });
  assert.equal(value.connection.tokenConfigured, true); assert.equal(value.sync.tokenConfigured, true);
  const reopened = create({ fs }).settings; attachConnection(reopened);
  assert.equal((await reopened.execute('get')).appearance, 'ocean');
  value = await reopened.update({ expectedRevision: 2, connection: { token: null }, sync: { token: null } });
  assert.equal(value.connection.tokenConfigured, false); assert.equal(value.sync.tokenConfigured, false);
  assert.equal(fs.files.size, 1);
});

test('stale settings revisions and concurrent updates preserve the winning settings', async () => {
  const { settings, fs } = create(); const other = create({ fs }).settings;
  const results = await Promise.allSettled([settings.update({ expectedRevision: 0, language: 'en' }), other.update({ expectedRevision: 0, appearance: 'midnight' })]);
  assert.equal(results.filter(value => value.status === 'fulfilled').length, 1);
  const stored = await settings.execute('get'); assert.equal(stored.revision, 1);
  await assert.rejects(other.update({ expectedRevision: 0, language: 'zh' }), error('SETTINGS_CONFLICT', 409));
  assert.equal((await settings.execute('get')).revision, 1); assert.equal(fs.files.size, 1);
});

test('invalid origins, repositories, paths, settings fields and themes never commit settings', async () => {
  const { settings, fs } = create();
  for (const patch of [
    { appearance: 'unknown' }, { language: 'fr' }, { connection: { apiUrl: 'http://public.example' } },
    { connection: { apiUrl: 'https://user:secret@memory.example' } }, { connection: { apiUrl: 'https://memory.example/path' } },
    { sync: { repositoryUrl: 'https://github.com/user/repo/path' } }, { sync: { repositoryUrl: 'https://github.com@evil.example/user/repo' } },
    { sync: { repositoryUrl: 'https://gitee.com/user/repo' } }, { sync: { path: '../memory.json' } },
    { sync: { path: '/memory.json' } }, { sync: { autoSync: 'yes' } }, { connection: { extra: true } }, { extra: true },
  ]) await assert.rejects(settings.update({ expectedRevision: 0, ...patch }), error('INVALID_INPUT', 400));
  assert.equal(fs.files.size, 0);
});

test('filesystem failures are explicit and do not reveal host paths or stored secrets', async () => {
  const { settings } = create({ dependencies: { fs: { async readFile() { throw new Error('C:/private-token/file'); } } } });
  await assert.rejects(settings.execute('get'), failure => { error('SETTINGS_IO', 503)(failure); assert.doesNotMatch(failure.message, /private-token/); return true; });
  const denied = create({ dependencies: { fs: { async mkdir() { throw new Error('path secret'); } } } }).settings;
  await assert.rejects(denied.update({ expectedRevision: 0, language: 'en' }), error('SETTINGS_IO', 503));
});

test('saved memory tokens remain bound to their origin and environment overrides take precedence', async () => {
  const { settings } = create(); let service = attachConnection(settings);
  await settings.update({ expectedRevision: 0, connection: { apiUrl: 'https://one.example', token: 'saved-secret' } });
  assert.equal((await service.connection()).token, 'saved-secret');
  await settings.update({ expectedRevision: 1, connection: { apiUrl: 'https://two.example', token: '' } });
  await assert.rejects(service.connection(), error('SETUP_REQUIRED', 503));
  service = attachConnection(settings, { env: { MORY_API_URL: 'https://admin.example', MORY_API_TOKEN: 'admin-secret' } });
  assert.deepEqual(await service.connection(), { baseUrl: 'https://admin.example', token: 'admin-secret' });
  const value = await settings.execute('get'); assert.equal(value.connection.managedByEnvironment, true); assert.doesNotMatch(JSON.stringify(value), /saved-secret|admin-secret|local-memory-secret/);
});

test('the configured device name is stored on new memories with a stable device identity', async () => {
  const { settings } = create({ dependencies: { hostname: () => 'host-machine' } }); let body;
  const service = attachConnection(settings, { fetch: async (_url, init) => { body = JSON.parse(init.body); return json({ memory: await memory('new-memory', body.text, { origin: body.origin }) }); } });
  await settings.update({ expectedRevision: 0, sync: { deviceName: 'Work desktop' } });
  const first = await settings.deviceOrigin(); await service.execute('create', { text: 'remember me' });
  assert.equal(body.origin.deviceName, 'Work desktop'); assert.equal(body.origin.deviceId, first.deviceId);
  await settings.update({ expectedRevision: 1, sync: { deviceName: 'Renamed desktop' } });
  assert.equal((await settings.deviceOrigin()).deviceId, first.deviceId);
  assert.equal((await settings.deviceOrigin()).deviceName, 'Renamed desktop'); settings.dispose();
});

test('provider changes preserve a stored token without forwarding it to another provider', async () => {
  let calls = 0;
  const { settings } = await configured({ dependencies: { fetch: async () => { calls++; return json({ private: true }); } } });
  const value = await settings.update({ expectedRevision: 1, sync: { provider: 'gitee', repositoryUrl: 'https://gitee.com/user/memory', token: '' } });
  assert.equal(value.sync.tokenStored, true); assert.equal(value.sync.tokenConfigured, false);
  await assert.rejects(settings.execute('check', { target: 'sync' }), error('SYNC_SETUP_REQUIRED', 400));
  assert.equal(calls, 0);
});

test('connection checks use protected Mory data and redact upstream failures', async () => {
  const { settings } = create(); let path;
  attachConnection(settings, { fetch: async url => { path = new URL(url).pathname; return json({ memories: [], total: 7, nextOffset: null }); } });
  assert.equal((await settings.execute('health')).total, 7); assert.equal(path, '/v1/memories');
  attachConnection(settings, { fetch: async () => json({ error: 'secret upstream payload' }, 401) });
  await assert.rejects(settings.execute('check', { target: 'mory' }), failure => { assert.doesNotMatch(failure.message, /secret/); assert.equal(failure.status, 401); return true; });
});

test('repository check discovers the branch and rejects public repositories before any write', async () => {
  const f = await syncFixture({ private: false });
  await assert.rejects(f.settings.execute('sync', { mode: 'push' }), error('PRIVATE_REPOSITORY_REQUIRED', 400));
  assert.equal(f.writes(), 0); assert.equal(f.localWrites(), 0);
  const ok = await syncFixture(); const result = await ok.settings.execute('check', { target: 'sync' });
  assert.equal(result.private, true); assert.equal(result.branch, 'main'); assert.equal(result.connected, true);
  assert.doesNotMatch(JSON.stringify(result), /provider-secret/);
});

test('pull merges remote records without dropping unrelated local memories or uploading', async () => {
  const f = await syncFixture(); const result = await f.settings.execute('sync', { mode: 'pull' });
  assert.equal(result.ok, true); assert.equal(result.remoteCommitted, false); assert.equal(f.writes(), 0);
  assert.deepEqual(new Set(f.local.memories.map(value => value.id)), new Set(['local', 'remote']));
  assert.equal(result.localApplied, true);
});

test('push and merge preserve divergent original records and tombstones on both sides', async () => {
  const local = await memory('same', 'local edit', { isPrivate: true });
  const remote = await memory('same', 'remote edit'); const deleted = await memory('deleted');
  const f = await syncFixture({ local: [local, deleted], remote: [remote], remoteTombstones: ['deleted'] });
  const result = await f.settings.execute('sync', { mode: 'merge' });
  assert.equal(result.ok, true); assert.equal(result.memories, 2); assert.equal(result.tombstones, 1);
  assert.ok(f.remote().memories.some(value => value.id.includes('~conflict~')));
  assert.ok(f.remote().memories.some(value => value.payload.content === 'local edit' && value.isPrivate));
  assert.ok(!f.local.memories.some(value => value.id === 'deleted')); assert.ok(f.local.tombstones.includes('deleted'));
});

test('a remote SHA conflict rereads and remerges before retrying the commit', async () => {
  const f = await syncFixture({ conflict: true }); const result = await f.settings.execute('sync', { mode: 'push' });
  assert.equal(result.retries, 1); assert.equal(f.writes(), 2);
  assert.deepEqual(new Set(f.remote().memories.map(value => value.id)), new Set(['local', 'remote', 'concurrent-remote']));
  assert.ok(f.local.memories.some(value => value.id === 'concurrent-remote'));
});

test('exhausted remote conflicts leave local data intact and record a redacted failure', async () => {
  const f = await syncFixture({ alwaysConflict: true });
  await assert.rejects(f.settings.execute('sync', { mode: 'merge' }), error('REMOTE_CONFLICT', 422));
  assert.equal(f.writes(), 4); assert.equal(f.localWrites(), 0); assert.equal(f.local.memories.length, 1);
  const last = (await f.settings.execute('get')).lastSync; assert.equal(last.status, 'error'); assert.doesNotMatch(JSON.stringify(last), /provider-secret/);
});

test('a local generation conflict after remote commit returns explicit partial status without overwriting', async () => {
  const f = await syncFixture({ localConflict: true }); const result = await f.settings.execute('sync', { mode: 'merge' });
  assert.equal(result.ok, false); assert.equal(result.status, 'partial'); assert.equal(result.remoteCommitted, true); assert.equal(result.localApplied, false);
  assert.ok(f.local.memories.some(value => value.id === 'concurrent-local')); assert.equal(f.local.memories.length, 2);
  assert.equal((await f.settings.execute('get')).lastSync.status, 'partial');
});

test('malformed remote snapshots never commit locally or remotely', async () => {
  const f = await syncFixture({ invalidRemote: true });
  await assert.rejects(f.settings.execute('sync', { mode: 'merge' }), error('INVALID_SNAPSHOT', 400));
  assert.equal(f.localWrites(), 0); assert.equal(f.writes(), 0);
  for (const value of [{ memories: [{ text: 'missing id' }] }, { memories: [], tombstones: [null] }, { schemaVersion: 99, memories: [] }]) await assert.rejects(parseSyncSnapshot(value), error('INVALID_SNAPSHOT', 400));
});

test('Gitee creates missing files with POST, encodes Unicode, and keeps secrets out of results', async () => {
  const f = await syncFixture({ provider: 'gitee', missingFile: true, local: [await memory('中文记忆', '用户的记忆')] });
  const result = await f.settings.execute('sync', { mode: 'push' });
  const write = f.requests.find(value => value.init.method === 'POST'); assert.ok(write);
  assert.equal(JSON.parse(write.init.body).access_token, 'provider-secret');
  assert.equal(f.remote().memories[0].payload.content, '用户的记忆'); assert.equal(result.provider, 'gitee');
  assert.doesNotMatch(JSON.stringify(result), /provider-secret/);
});

test('remote transport limits responses, refuses redirects, and sanitizes provider errors', async () => {
  let cancelled = false;
  const f = await configured({ dependencies: { fetch: async (_url, init) => {
    assert.equal(init.redirect, 'error');
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); }, cancel() { cancelled = true; } }));
  } } });
  await assert.rejects(f.settings.execute('check', { target: 'sync' }), error('RESPONSE_TOO_LARGE', 502)); assert.equal(cancelled, true);
  f.settings.fetch = async () => json({ message: 'provider-secret' }, 403);
  await assert.rejects(f.settings.execute('check', { target: 'sync' }), failure => { assert.equal(failure.code, 'REMOTE_ERROR'); assert.doesNotMatch(failure.message, /provider-secret/); return true; });
  const empty = await syncFixture({ emptySuccess: true });
  const committed = await empty.settings.execute('sync', { mode: 'merge' });
  assert.equal(committed.ok, true); assert.equal(committed.remoteCommitted, true); assert.equal(committed.localApplied, true);
  assert.deepEqual(new Set(empty.local.memories.map(value => value.id)), new Set(['local', 'remote']));
});

test('saving or opening settings never uploads; automatic sync debounces later mutations and cleans up', async () => {
  let nextId = 0, cancelled = 0; const timers = new Map();
  const { settings } = await configured({ sync: { autoSync: true }, dependencies: { setTimeout: callback => { const id = ++nextId; timers.set(id, callback); return id; }, clearTimeout: id => { cancelled++; timers.delete(id); } } });
  await settings.execute('get'); assert.equal(timers.size, 0);
  let syncs = 0;
  settings.synchronize = async mode => { syncs++; assert.equal(mode, 'merge'); };
  await settings.afterMutation(); await settings.afterMutation(); assert.equal(timers.size, 1); assert.equal(cancelled, 1);
  await [...timers.values()][0](); assert.equal(syncs, 1);
  await settings.afterMutation(); settings.dispose(); assert.equal(settings.timer, null);
  await settings.afterMutation(); assert.equal(syncs, 1);
});

test('plugin disposal aborts an active automatic sync', async () => {
  let callback; let signal;
  const { settings } = await configured({ sync: { autoSync: true }, dependencies: { setTimeout: next => { callback = next; return 1; }, clearTimeout() {} } });
  let entered; const ready = new Promise(resolve => { entered = resolve; });
  settings.synchronize = async (_mode, incoming) => { signal = incoming; entered(); await new Promise((_resolve, reject) => incoming.addEventListener('abort', () => reject(new Error('aborted')), { once: true })); };
  await settings.afterMutation(); const pending = callback(); await ready; settings.dispose(); await pending; assert.equal(signal.aborted, true);
});

test('the settings tool and authenticated panel dispatcher call the same settings operation', async t => {
  const calls = [], disposers = [], tools = new Map(); let route;
  t.mock.method(MorySettingsService.prototype, 'update', async input => { calls.push(input); return { revision: 1, appearance: 'midnight', connection: { tokenConfigured: false }, sync: { tokenConfigured: false } }; });
  const ctx = { effect(setup) { disposers.push(setup()); }, tools: { register(value) { tools.set(value.name, value); return () => tools.delete(value.name); } }, connection: { fetch: { register(value) { route = value; return async () => {}; } } } };
  apply(ctx); t.after(async () => { for (const dispose of disposers.reverse()) await dispose?.(); });
  const body = { expectedRevision: 0, appearance: 'midnight' };
  const response = await route.fetch(new Request('http://dsh.test/api/mory', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'settings.update', ...body }) }));
  const tool = tools.get('mory_settings'); const value = await tool.execute({ action: 'update', ...body }, { signal: new AbortController().signal });
  assert.deepEqual(await response.json(), value); assert.deepEqual(calls, [body, body]);
  assert.equal(tool.isConcurrencySafe({ action: 'get' }), true); assert.equal(tool.isConcurrencySafe({ action: 'sync' }), false);
  assert.ok(tools.has('mory_memory'));
});
