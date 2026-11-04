import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { MoryService, MoryError } from '../service.mjs';
import { apply } from '../index.js';
import { MorySettingsService } from '../settings.mjs';

const memory = (overrides = {}) => ({
  id: 'memory-1', revision: 1, kind: 'note', tags: [], scope: {},
  payload: { title: 'Preference', content: 'Prefers concise answers.' },
  source: 'dsh', status: 'active', isPrivate: false,
  updatedAt: '2026-01-01T00:00:00.000Z', capturedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});
const json = (value, status = 200) => Response.json(value, { status });
const hasError = (code, status) => error => {
  assert.ok(error instanceof MoryError);
  assert.equal(error.code, code);
  if (status !== undefined) assert.equal(error.status, status);
  return true;
};
function service(fetchImpl = async () => json({}), options = {}) {
  return new MoryService(options.config ?? {}, {
    env: {}, home: '/mory-test-home',
    readFile: async () => JSON.stringify({ port: 8787, token: 'local-secret' }),
    fetch: fetchImpl, ...options.dependencies,
  });
}
function host(t, fetchImpl) {
  t.mock.method(MorySettingsService.prototype, 'afterMutation', async () => {});
  t.mock.method(MorySettingsService.prototype, 'deviceOrigin', async () => ({ deviceId: 'test-device', deviceName: 'Test device' }));
  t.mock.method(MoryService.prototype, 'connection', async () => ({
    baseUrl: 'http://127.0.0.1:8787', token: 'host-secret',
  }));
  t.mock.method(globalThis, 'fetch', fetchImpl);
  const disposers = [];
  const registrations = { tool: undefined, route: undefined, removed: [] };
  const ctx = {
    effect(setup) { const dispose = setup(); disposers.push(dispose); return dispose; },
    tools: { register(definition) {
      if (definition.name === 'mory_settings') return () => registrations.removed.push('settingsTool');
      registrations.tool = definition;
      return () => registrations.removed.push('tool');
    } },
    connection: { fetch: { register(definition) {
      registrations.route = definition;
      return async () => { registrations.removed.push('route'); };
    } } },
  };
  apply(ctx);
  registrations.dispose = async () => {
    for (const dispose of disposers.splice(0).reverse()) await dispose?.();
  };
  t.after(() => registrations.dispose());
  return registrations;
}
const panelRequest = input => new Request('http://dsh.test/api/mory', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
});

test('configuration discovers MORY_HOME and keeps local credentials on the Host', async () => {
  let readPath;
  const api = service(undefined, { dependencies: {
    env: { MORY_HOME: '/chosen-mory' },
    readFile: async path => { readPath = path; return JSON.stringify({ port: 9888, token: 'private-token' }); },
  } });
  assert.deepEqual(await api.connection(), { baseUrl: 'http://127.0.0.1:9888', token: 'private-token' });
  assert.equal(readPath, join('/chosen-mory', 'config.json'));
});

test('explicit configuration overrides environment URL and selects the named token environment variable', async () => {
  let readPath;
  const api = service(undefined, {
    config: { configPath: '/custom/config.json', apiUrl: 'https://memory.example', tokenEnv: 'CUSTOM_MORY_TOKEN' },
    dependencies: {
      env: { MORY_API_URL: 'https://other.example', MORY_API_TOKEN: 'wrong-token', CUSTOM_MORY_TOKEN: 'chosen-token' },
      readFile: async path => { readPath = path; return '{"token":"local-secret"}'; },
    },
  });
  assert.equal(readPath, undefined);
  assert.deepEqual(await api.connection(), { baseUrl: 'https://memory.example', token: 'chosen-token' });
  assert.equal(readPath, '/custom/config.json');
});

test('a remote URL cannot implicitly receive the local config token', async () => {
  let calls = 0;
  const api = service(async () => { calls++; return json({}); }, { config: { apiUrl: 'https://memory.example' } });
  await assert.rejects(api.execute('status'), hasError('SETUP_REQUIRED', 503));
  assert.equal(calls, 0);
  const explicit = service(undefined, { dependencies: {
    env: { MORY_API_URL: 'https://memory.example', MORY_API_TOKEN: 'remote-secret' },
  } });
  assert.equal((await explicit.connection()).token, 'remote-secret');
});

test('unsafe upstream origins are rejected before any network request', async () => {
  for (const apiUrl of [
    'http://remote.example', 'ftp://127.0.0.1', 'https://name:secret@memory.example',
    'https://memory.example/prefix', 'https://memory.example/?token=secret', 'https://memory.example/#fragment',
  ]) {
    await assert.rejects(service(undefined, { config: { apiUrl } }).connection(), hasError('CONFIG_INVALID', 503), apiUrl);
  }
});

test('missing config can use explicit environment credentials while malformed config fails clearly', async () => {
  const absent = Object.assign(new Error('absent'), { code: 'ENOENT' });
  const api = service(undefined, { dependencies: {
    env: { MORY_API_URL: 'https://memory.example', MORY_API_TOKEN: 'remote-secret' },
    readFile: async () => { throw absent; },
  } });
  assert.equal((await api.connection()).token, 'remote-secret');
  const malformed = service(undefined, { dependencies: { readFile: async () => 'not JSON' } });
  await assert.rejects(malformed.connection(), hasError('CONFIG_INVALID', 503));
});

test('status verifies a protected endpoint and does not mistake public health for authentication', async () => {
  const calls = [];
  const api = service(async (url, init) => {
    calls.push({ url: new URL(url), init });
    return json({ error: 'Invalid token.' }, 401);
  });
  await assert.rejects(api.execute('status'), hasError('UNAUTHORIZED', 401));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.pathname, '/v1/memories');
  assert.equal(calls[0].init.headers.authorization, 'Bearer local-secret');
});

test('upstream fetch disallows redirects and receives a cancellation signal', async () => {
  const controller = new AbortController();
  const api = service(async (_url, init) => {
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.signal.aborted, false);
    return json({ memories: [], total: 0, offset: 0, nextOffset: null });
  });
  await api.execute('list', {}, controller.signal);
});

test('list preserves pagination and safely encodes project filters without returning embeddings', async () => {
  const api = service(async (url, init) => {
    const target = new URL(url);
    assert.equal(init.method, 'GET');
    assert.equal(target.searchParams.get('limit'), '7');
    assert.equal(target.searchParams.get('offset'), '14');
    assert.equal(target.searchParams.get('projectId'), 'project & private');
    return json({ memories: [memory({ embedding: [0.1, 0.2] })], total: 25, offset: 14, nextOffset: 21 });
  });
  const result = await api.execute('list', { limit: 7, offset: 14, projectId: 'project & private' });
  assert.equal(result.total, 25);
  assert.equal(result.nextOffset, 21);
  assert.equal(result.memories[0].id, 'memory-1');
  assert.equal(result.memories[0].embedding, undefined);
});

test('search and context send the query and project scope in the JSON body', async () => {
  const paths = [];
  const api = service(async (url, init) => {
    paths.push(new URL(url).pathname);
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { query: '部署偏好', scope: { projectId: 'p-1' }, limit: 3 });
    return json({ results: [{ score: 2, memory: memory() }], memories: [memory()], context: '- Prefers concise answers.' });
  });
  assert.equal((await api.execute('search', { query: '部署偏好', projectId: 'p-1', limit: 3 })).results[0].memory.id, 'memory-1');
  assert.match((await api.execute('context', { query: '部署偏好', projectId: 'p-1', limit: 3 })).context, /concise/);
  assert.deepEqual(paths, ['/v1/memories/search', '/v1/context']);
});

test('create, update and forget use their exact methods, provenance and revision bodies', async () => {
  const calls = [];
  const api = service(async (url, init) => {
    calls.push({ path: new URL(url).pathname, method: init.method, body: JSON.parse(init.body) });
    return json({ ok: true, memory: memory({ revision: calls.length }) });
  });
  await api.execute('create', { text: 'Keep exactly this.', projectId: 'p-1' }, undefined, { type: 'agent', id: 'session-1' });
  await api.execute('update', { memoryId: 'id /?#', text: 'Correction.', expectedRevision: 1 });
  await api.execute('forget', { memoryId: 'memory-1', expectedRevision: 2 });
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].path, '/v1/memories');
  assert.equal(calls[0].body.text, 'Keep exactly this.');
  assert.deepEqual(calls[0].body.actor, { type: 'agent', id: 'session-1' });
  assert.deepEqual(calls[0].body.scope, { projectId: 'p-1' });
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[1].path, '/v1/memories/id%20%2F%3F%23');
  assert.equal(calls[1].body.expectedRevision, 1);
  assert.equal(calls[2].method, 'DELETE');
  assert.deepEqual(calls[2].body, { expectedRevision: 2 });
});

test('invalid revisions and pagination never dispatch a mutation or read', async () => {
  let calls = 0;
  const api = service(async () => { calls++; return json({}); });
  for (const [action, input] of [
    ['update', { memoryId: 'memory-1', text: 'new' }],
    ['forget', { memoryId: 'memory-1' }],
    ['forget', { memoryId: 'memory-1', expectedRevision: 0 }],
    ['update', { memoryId: 'memory-1', text: 'new', expectedRevision: 1.5 }],
    ['list', { limit: 0 }], ['list', { limit: 51 }], ['list', { offset: -1 }],
    ['search', { query: 'q', limit: 1000 }],
  ]) await assert.rejects(api.execute(action, input), hasError('INVALID_INPUT', 400));
  assert.equal(calls, 0);
});

test('a stale revision produces a conflict without retrying or overwriting the winning update', async () => {
  let current = memory();
  let writes = 0;
  const api = service(async (_url, init) => {
    const input = JSON.parse(init.body);
    if (input.expectedRevision !== current.revision) return json({ error: 'Memory changed. Reload before saving.' }, 409);
    writes++;
    current = memory({ revision: current.revision + 1, payload: { title: 'Preference', content: input.text } });
    return json({ ok: true, memory: current });
  });
  await api.execute('update', { memoryId: current.id, expectedRevision: 1, text: 'Winning edit.' });
  await assert.rejects(api.execute('update', { memoryId: current.id, expectedRevision: 1, text: 'Stale edit.' }), hasError('REVISION_CONFLICT', 409));
  assert.equal(writes, 1);
  assert.equal(current.payload.content, 'Winning edit.');
});

test('empty and traversal identifiers are rejected before dispatch', async () => {
  let calls = 0;
  const api = service(async () => { calls++; return json({}); });
  for (const memoryId of ['', '  ', '.', '..']) {
    await assert.rejects(api.execute('get', { memoryId }), hasError('INVALID_INPUT', 400));
  }
  assert.equal(calls, 0);
});

test('context bounds its prompt text and explicitly reports truncation', async () => {
  const api = service(async () => json({ memories: [memory()], context: 'x'.repeat(100_000) }));
  const result = await api.execute('context', { query: 'preference' });
  assert.ok(result.context.length <= 24_000);
  assert.equal(result.truncated, true);
});

test('oversized upstream streams are cancelled before JSON parsing', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); },
    cancel() { cancelled = true; },
  });
  const api = service(async () => new Response(body));
  await assert.rejects(api.request('/v1/memories'), hasError('RESPONSE_TOO_LARGE', 502));
  assert.equal(cancelled, true);
});

test('invalid upstream JSON is reported without exposing the response body', async () => {
  const api = service(async () => new Response('secret invalid response'));
  await assert.rejects(api.request('/v1/memories'), error => {
    hasError('INVALID_RESPONSE', 502)(error);
    assert.doesNotMatch(error.message, /secret/);
    return true;
  });
});

test('caller cancellation interrupts an in-flight upstream fetch', async () => {
  const controller = new AbortController();
  let observed;
  const api = service(async (_url, init) => new Promise((_resolve, reject) => {
    observed = init.signal;
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    controller.abort();
  }));
  await assert.rejects(api.request('/v1/memories', 'GET', undefined, controller.signal), hasError('ABORTED', 499));
  assert.equal(observed.aborted, true);
});

test('caller cancellation during response transfer remains a cancellation failure', async () => {
  const controller = new AbortController();
  const api = service(async (_url, init) => {
    const body = new ReadableStream({
      start(stream) {
        init.signal.addEventListener('abort', () => stream.error(init.signal.reason), { once: true });
      },
      pull() { controller.abort(); },
    });
    return new Response(body);
  });
  await assert.rejects(api.request('/v1/memories', 'GET', undefined, controller.signal), hasError('ABORTED', 499));
});

test('the Host route and native tool operate on the same data with caller-specific provenance', async t => {
  let current;
  const actors = [];
  const installed = host(t, async (_url, init) => {
    if (init.method === 'POST') {
      const input = JSON.parse(init.body);
      actors.push(input.actor);
      current = memory({ payload: { title: 'Shared', content: input.text } });
      return json({ memory: current });
    }
    return json({ memories: current ? [current] : [], total: current ? 1 : 0, offset: 0, nextOffset: null });
  });
  assert.equal(installed.route.path, '/api/mory');
  assert.deepEqual(installed.route.methods, ['POST']);
  const created = await installed.route.fetch(panelRequest({ action: 'create', text: 'Created in panel.' }));
  assert.equal(created.status, 200);
  assert.equal(created.headers.get('cache-control'), 'no-store');
  const exec = { signal: new AbortController().signal, agent: { id: 'session-test' } };
  const listed = await installed.tool.execute({ action: 'list' }, exec);
  assert.equal(listed.memories[0].id, (await created.json()).memory.id);
  await installed.tool.execute({ action: 'create', text: 'Created by agent.' }, exec);
  assert.deepEqual(actors, [{ type: 'human', id: 'dsh' }, { type: 'agent', id: 'session-test' }]);
  assert.equal(installed.tool.output.render({}, listed)[0].type, 'text');
});

test('the Host route rejects malformed requests without touching Mory', async t => {
  let calls = 0;
  const installed = host(t, async () => { calls++; return json({}); });
  for (const [body, contentType, expected] of [
    ['{}', 'text/plain', 415], ['{', 'application/json', 400],
    ['[]', 'application/json', 400], ['null', 'application/json', 400],
    ['{"action":"unknown"}', 'application/json', 400],
    ['{"action":"update","memoryId":"m1","text":"new"}', 'application/json', 400],
  ]) {
    const response = await installed.route.fetch(new Request('http://dsh.test/api/mory', {
      method: 'POST', headers: { 'content-type': contentType }, body,
    }));
    assert.equal(response.status, expected);
    assert.equal((await response.json()).error.code, 'INVALID_INPUT');
  }
  assert.equal(calls, 0);
});

test('the streaming Host route rejects oversized bodies before upstream dispatch', async t => {
  let calls = 0;
  const installed = host(t, async () => { calls++; return json({}); });
  assert.equal(installed.route.requestBody, 'streaming');
  const response = await installed.route.fetch(panelRequest({ action: 'create', text: 'x'.repeat(1024 * 1024 + 1) }));
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('plugin disposal aborts pending operations and unregisters the route and tool', async t => {
  let upstreamSignal;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const installed = host(t, async (_url, init) => new Promise((_resolve, reject) => {
    upstreamSignal = init.signal;
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    started();
  }));
  const pending = installed.route.fetch(panelRequest({ action: 'status' }));
  await ready;
  await installed.dispose();
  assert.equal(upstreamSignal.aborted, true);
  assert.equal((await pending).status, 499);
  assert.deepEqual(installed.removed.sort(), ['route', 'settingsTool', 'tool']);
});

test('the tool allows concurrent reads but keeps mutations exclusive', async t => {
  const installed = host(t, async () => json({}));
  for (const action of ['status', 'list', 'search', 'context', 'get']) assert.equal(installed.tool.isConcurrencySafe({ action }), true);
  for (const action of ['create', 'update', 'forget', 'unknown']) assert.notEqual(installed.tool.isConcurrencySafe({ action }), true);
});

test('tool get pages complete content without leaking the full payload, while panel get retains the original', async t => {
  const content = '记忆😀line\n'.repeat(4000);
  let calls = 0;
  const installed = host(t, async () => {
    calls++;
    return json({ memory: memory({ payload: { title: 'Paged record', content }, tags: ['comma,inside'] }) });
  });
  const exec = { signal: new AbortController().signal, agent: { id: 'paging-test' } };
  let offset = 0;
  let reconstructed = '';
  let pages = 0;
  do {
    const page = await installed.tool.execute({ action: 'get', memoryId: 'memory-1', textOffset: offset, textLimit: 7777 }, exec);
    assert.equal(page.textOffset, offset);
    assert.equal(page.totalCharacters, content.length);
    assert.ok(page.text.length > 0 && page.text.length <= 7777);
    assert.equal(page.memory.payload, undefined);
    assert.equal(page.memory.revision, 1);
    reconstructed += page.text;
    offset = page.nextTextOffset;
    pages++;
    assert.ok(pages < 20, 'pagination must terminate');
  } while (offset !== null);
  assert.equal(reconstructed, content);
  assert.ok(pages > 1);
  const first = await installed.tool.execute({ action: 'get', memoryId: 'memory-1' }, exec);
  assert.equal(first.text.length, 12000);
  const end = await installed.tool.execute({ action: 'get', memoryId: 'memory-1', textOffset: content.length }, exec);
  assert.equal(end.text, '');
  assert.equal(end.nextTextOffset, null);
  const beforeInvalid = calls;
  for (const paging of [{ textOffset: -1 }, { textOffset: 0.5 }, { textLimit: 0 }, { textLimit: 20001 }]) {
    await assert.rejects(installed.tool.execute({ action: 'get', memoryId: 'memory-1', ...paging }, exec), hasError('INVALID_INPUT', 400));
  }
  assert.equal(calls, beforeInvalid);
  const panel = await installed.route.fetch(panelRequest({ action: 'get', memoryId: 'memory-1' }));
  const record = (await panel.json()).memory;
  assert.equal(record.payload.content, content);
  assert.deepEqual(record.tags, ['comma,inside']);
});
