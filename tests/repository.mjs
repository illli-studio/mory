import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openRepository } from '../apps/api/repository.mjs';
import { normalizeMemory, mergeSnapshots, memoryFingerprint } from '../packages/memory-core/protocol.mjs';

const fixture = (id, overrides={}) => ({id,title:`Title ${id}`,text:`Content for ${id}`,source:'manual',...overrides});
async function repository(t) { const repo=await openRepository(':memory:');t.after(()=>repo.close());return repo; }

test('API contract preserves URL, privacy, origin, timestamps and structured fields', async t=>{
  const repo=await repository(t);
  const input=fixture('roundtrip',{payload:{title:'Bookmark',content:'Private content',url:'https://example.com'},isPrivate:true,origin:{deviceId:'laptop',deviceName:'Laptop'},capturedAt:'2026-01-01T00:00:00.000Z',fields:{amount:12},tags:['Project'],scope:{projectId:'mory'}});
  const {memory}=await repo.create(input);
  const reloaded=repo.get(memory.id);
  assert.equal(reloaded.isPrivate,true);assert.equal(reloaded.payload.url,'https://example.com');assert.deepEqual(reloaded.origin,input.origin);assert.deepEqual(reloaded.fields,input.fields);assert.equal(reloaded.capturedAt,input.capturedAt);
});
test('invalid updates and stale revisions never discard the original',async t=>{
  const repo=await repository(t);const {memory}=await repo.create(fixture('edit'));
  await assert.rejects(repo.update(memory.id,{tags:{}},memory.revision));assert.equal(repo.get(memory.id).payload.content,memory.payload.content);
  const next=await repo.update(memory.id,{text:'Changed'},memory.revision);
  assert.notEqual(next.contentHash,memory.contentHash);
  await assert.rejects(repo.update(memory.id,{text:'Stale edit'},memory.revision),/changed/);
  assert.equal(repo.get(memory.id).payload.content,'Changed');
  assert.deepEqual(repo.history(memory.id).map(row=>row.memory.payload.content),[memory.payload.content,'Changed']);
});
test('updates can clear a URL and empty content while retaining a title',async t=>{
  const repo=await repository(t);const {memory}=await repo.create(fixture('url',{url:'https://example.com'}));
  const next=await repo.update(memory.id,{payload:{url:null},text:''},memory.revision);
  assert.equal(next.payload.url,undefined);assert.equal(next.payload.content,'');
});
test('batch import validates all records and rolls back on conflicts',async t=>{
  const repo=await repository(t);
  await assert.rejects(repo.importMemories([fixture('valid'),{id:'bad',text:''}]));assert.equal(repo.list().length,0);
  await repo.create(fixture('existing'));
  await assert.rejects(repo.importMemories([fixture('new'),fixture('existing',{text:'different'})]));assert.equal(repo.get('new'),undefined);
});
test('deleted records and remote-only tombstones cannot be resurrected by import',async t=>{
  const repo=await repository(t);const {memory}=await repo.create(fixture('deleted'));
  await repo.update(memory.id,{status:'deleted'},memory.revision);
  const result=await repo.importMemories([fixture('deleted')]);assert.equal(result.deletedCount,1);assert.equal(repo.list().length,0);
  await repo.reconcile({memories:[],tombstones:['remote-deleted']});
  await assert.rejects(repo.create(fixture('remote-deleted')),/deleted/);
  await repo.reconcile({memories:[fixture('remote-deleted')],tombstones:[]});assert.equal(repo.list().length,0);
});
test('snapshot returns every memory; sync preserves unrelated data and detects concurrent writes',async t=>{
  const repo=await repository(t);
  await repo.importMemories(Array.from({length:230},(_,i)=>fixture(`record-${i}`)));
  const base=repo.snapshot();assert.equal(base.memories.length,230);
  await repo.create(fixture('concurrent'));
  await assert.rejects(repo.reconcile({memories:[],tombstones:['record-0'],expectedGeneration:base.generation}),/changed/);
  assert.equal(repo.list().length,231);
  const merged=await repo.reconcile({memories:[fixture('added')],tombstones:['record-0']});
  assert.equal(merged.memories.length,231);assert.ok(merged.memories.some(m=>m.id==='concurrent'));assert.ok(merged.tombstones.includes('record-0'));
});
test('same-id edits retain both copies and repeated merges are stable',async()=>{
  const a=await normalizeMemory(fixture('same',{text:'version A',updatedAt:'2026-01-01T00:00:00Z'}));
  const b=await normalizeMemory(fixture('same',{text:'version B',updatedAt:'2026-02-01T00:00:00Z'}));
  const merged=mergeSnapshots({memories:[a],tombstones:[]},{memories:[b],tombstones:[]});
  assert.equal(merged.memories.length,2);assert.deepEqual(new Set(merged.memories.map(m=>m.payload.content)),new Set(['version A','version B']));
  assert.equal(mergeSnapshots(merged,{memories:[a],tombstones:[]}).memories.length,2);
});
test('FTS5 BM25 retrieves Chinese and English terms within the requested scope',async t=>{
  const repo=await repository(t);
  await repo.create(fixture('zh',{text:'我们决定使用本地数据库保存项目记忆',scope:{projectId:'a'}}));
  await repo.create(fixture('en',{text:'SQLite architecture durable memory',scope:{projectId:'b'}}));
  assert.equal(repo.search('数据库',{projectId:'a'},10)[0].memory.id,'zh');
  assert.equal(repo.search('durable',{projectId:'b'},10)[0].memory.id,'en');assert.equal(repo.search('durable',{projectId:'a'},10).length,0);
  assert.ok(repo.db.prepare('SELECT count(*) AS n FROM memory_entities').get().n>0);
});
test('consistent SQLite backup and JSON archive restore full content, tombstones and history',async t=>{
  const repo=await repository(t);const restored=await repository(t);
  const {memory}=await repo.create(fixture('history',{isPrivate:true}));
  const edited=await repo.update(memory.id,{text:'New content'},memory.revision);
  await repo.update(memory.id,{status:'deleted'},edited.revision);
  await repo.reconcile({memories:[],tombstones:['never-seen']});
  const dir=await mkdtemp(join(tmpdir(),'mory-restore-'));const file=join(dir,'snapshot.sqlite');
  try {
    const archive=await repo.backup(file);const copy=new DatabaseSync(file,{readOnly:true});
    try { assert.equal(copy.prepare('SELECT count(*) AS n FROM memory_versions').get().n,archive.history.length); } finally {copy.close();}
    await restored.restore(archive);
    assert.equal(memoryFingerprint(restored.get('history')),memoryFingerprint(repo.get('history')));
    assert.equal(restored.history('history').length,3);assert.deepEqual(new Set(restored.snapshot().tombstones),new Set(['history','never-seen']));
  }finally{for(const name of await readdir(dir))await unlink(join(dir,name));await rmdir(dir);}
});


test('legacy SQLite migration preserves the surviving original and is idempotent',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'mory-migrate-')),file=join(dir,'legacy.sqlite');
  let repo;
  try {
    const legacy=new DatabaseSync(file);
    legacy.exec("CREATE TABLE memories(id TEXT PRIMARY KEY,text TEXT NOT NULL,title TEXT NOT NULL,kind TEXT NOT NULL,source TEXT NOT NULL,actor_type TEXT,actor_id TEXT,scope_json TEXT NOT NULL,metadata_json TEXT NOT NULL,tags_json TEXT NOT NULL,hash TEXT NOT NULL,confidence REAL NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,source_event_ids_json TEXT NOT NULL,embedding_json TEXT)");
    legacy.prepare('INSERT INTO memories VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('legacy','Original surviving text','Original title','note','agent','agent','test','{}','{}','[]','old-hash',1,'active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','[]',null);
    legacy.close();repo=await openRepository(file);
    assert.equal(repo.get('legacy').payload.content,'Original surviving text');
    assert.equal(repo.history('legacy').length,1);
    await repo.update('legacy',{text:'Edited after migration'},1);
    assert.equal(repo.history('legacy')[0].memory.payload.content,'Original surviving text');
    repo.close();repo=await openRepository(file);
    assert.equal(repo.history('legacy').length,2);assert.equal(repo.get('legacy').revision,2);
  }finally{repo?.close();for(const name of await readdir(dir))await unlink(join(dir,name));await rmdir(dir);}
});
