import assert from 'node:assert/strict';
import { test,before } from 'node:test';
import { webModule,fakeIndexedDb } from './helpers/web-module.mjs';
import { normalizeMemory } from '../packages/memory-core/protocol.mjs';
const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
globalThis.window={location:{port:'5173',origin:'http://127.0.0.1:5173'}};
before(fakeIndexedDb);
const fixture=(id,text=id)=>normalizeMemory({id,title:id,text,source:'manual'});
async function local(t,name){
  globalThis.fetch=async()=>new Response('',{status:404});values.clear();
  const module=await webModule('db',name);await module.db.delete();await module.db.open();
  t.after(async()=>{module.db.close();await module.db.delete();});return module;
}
test('IndexedDB edits rehash content and preserve complete local history',async t=>{
  const db=await local(t,'history');const a=await db.saveMemory(await fixture('one','original'));
  const b=await db.updateMemory({...a,payload:{...a.payload,content:'edited'}});
  assert.notEqual(a.contentHash,b.contentHash);assert.equal(b.revision,2);
  await assert.rejects(db.updateMemory({...a,payload:{...a.payload,content:'stale'}}),/changed/);
  assert.equal((await db.loadMemories())[0].payload.content,'edited');assert.equal(await db.db.versions.count(),2);
});
test('IndexedDB sync is atomic on validation failure and retains unrelated records',async t=>{
  const db=await local(t,'atomic');await db.saveMemory(await fixture('one'));
  const base=await db.loadRepositorySnapshot();
  await assert.rejects(db.applyRepositorySnapshot({...base,memories:[{id:'invalid'}],tombstones:['one']},base.generation));
  assert.equal((await db.loadMemories()).length,1);assert.equal(await db.db.tombstones.count(),0);
  await db.applyRepositorySnapshot({...base,memories:[await fixture('two')],tombstones:[]},base.generation);
  assert.equal((await db.loadMemories()).length,2);
});
test('IndexedDB refuses a stale sync and carries persistent deletion intent',async t=>{
  const db=await local(t,'concurrent');await db.saveMemory(await fixture('one'));
  const base=await db.loadRepositorySnapshot();await db.saveMemory(await fixture('two'));
  await assert.rejects(db.applyRepositorySnapshot({...base,tombstones:['two']},base.generation),/changed/);
  assert.equal((await db.loadMemories()).length,2);
  await db.deleteMemory('one');const latest=await db.loadRepositorySnapshot();
  assert.ok(latest.tombstones.includes('one'));
  await db.applyRepositorySnapshot({...latest,memories:[await fixture('one')],tombstones:[]},latest.generation);
  assert.equal((await db.loadMemories()).some(m=>m.id==='one'),false);
});
test('legacy migration runs once per API repository and does not reimport after clearing',async t=>{
  const db=await local(t,'migration');await db.db.memories.add(await fixture('legacy'));
  let imports=0;let memories=[];
  globalThis.fetch=async(url,init={})=>{
    if(url==='/runtime-config')return Response.json({apiUrl:'http://127.0.0.1:8787',token:'fake'});
    if(url.endsWith('/v1/snapshot'))return Response.json({repositoryId:'same-api',generation:1,memories,tombstones:[]});
    if(url.endsWith('/v1/sync')){imports++;memories=JSON.parse(init.body).memories;return Response.json({repositoryId:'same-api',generation:2,memories,tombstones:[]});}
    throw new Error(`Unexpected request ${url}`);
  };
  assert.equal((await db.loadMemories()).length,1);memories=[];
  assert.equal((await db.loadMemories()).length,0);assert.equal(imports,1);
});
test('API adapter loads a complete snapshot, preserves fields and sends expected revision',async t=>{
  const db=await local(t,'api');const memory=await normalizeMemory({id:'private',text:'secret',isPrivate:true,url:'https://example.com',origin:{deviceId:'a',deviceName:'Laptop'},revision:5});
  let patch;
  globalThis.fetch=async(url,init={})=>{
    if(url==='/runtime-config')return Response.json({apiUrl:'http://127.0.0.1:8787',token:'fake'});
    if(url.endsWith('/v1/snapshot'))return Response.json({repositoryId:'api',generation:1,memories:Array.from({length:230},(_,i)=>({...memory,id:`id-${i}`})),tombstones:[]});
    if(init.method==='PATCH'){patch=JSON.parse(init.body);return Response.json({memory:{...patch,revision:6}});}
    throw new Error(`Unexpected request ${url}`);
  };
  const all=await db.loadMemories();assert.equal(all.length,230);assert.equal(all[0].isPrivate,true);assert.equal(all[0].payload.url,'https://example.com');assert.equal(all[0].origin.deviceName,'Laptop');
  const updated=await db.updateMemory(memory);assert.equal(patch.expectedRevision,5);assert.equal(updated.revision,6);
});
test('GitHub 409 retries merge the newly read remote content before uploading',async()=>{
  const api=await webModule('github-sync');const a=await fixture('a'),b=await fixture('b');let reads=0,puts=0;const writes=[];
  globalThis.fetch=async(url,init={})=>{
    if(init.method==='PUT'){puts++;const input=JSON.parse(init.body);writes.push({sha:input.sha,snapshot:JSON.parse(Buffer.from(input.content,'base64').toString())});return Response.json(puts===1?{message:'conflict'}:{ok:true},{status:puts===1?409:200});}
    reads++;return Response.json({sha:reads===1?'old':'new',content:Buffer.from(JSON.stringify({memories:reads===1?[a]:[a,b],tombstones:['deleted']})).toString('base64')});
  };
  const result=await api.pushGithubMemories({provider:'github',token:'fake',owner:'test',repo:'test',branch:'main',path:'mory.json',autoSync:false,deviceName:'test'},[a]);
  assert.equal(writes.length,2);assert.equal(writes[1].sha,'new');assert.deepEqual(new Set(writes[1].snapshot.memories.map(m=>m.id)),new Set(['a','b']));assert.ok(result.snapshot.tombstones.includes('deleted'));
});
test('malformed remote snapshots abort before any GitHub write',async()=>{
  const api=await webModule('github-sync');let writes=0;
  globalThis.fetch=async(url,init={})=>{if(init.method==='PUT')writes++;return Response.json({sha:'x',content:Buffer.from(JSON.stringify({unexpected:'data'})).toString('base64')});};
  await assert.rejects(api.pushGithubMemories({provider:'github',token:'fake',owner:'test',repo:'test',branch:'main',path:'mory.json',autoSync:false,deviceName:'test'},[]),/Invalid remote/);assert.equal(writes,0);
});


test('IndexedDB batch import rolls back an intermediate storage failure',async t=>{
  const db=await local(t,'batch');await db.saveMemory(await fixture('original'));
  const fail=function(key,obj){if(obj.memoryId==='fail')throw new Error('simulated storage failure');};
  db.db.versions.hook('creating',fail);
  await assert.rejects(db.importMemoryBatch([await fixture('first'),await fixture('fail')]),/simulated storage/);
  db.db.versions.hook('creating').unsubscribe(fail);
  assert.deepEqual((await db.loadMemories()).map(m=>m.id),['original']);
});
