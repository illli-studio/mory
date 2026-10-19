import { memoryFingerprint, mergeSnapshots, normalizeMemory, type MemoryObject } from "@mory/memory-core";
import Dexie, { type Table } from "dexie";

interface Meta { key: string; value: string; }
interface Version { key?: number; memoryId: string; memory: MemoryObject; action: string; }
export interface RepositorySnapshot { schemaVersion?: number; repositoryId?: string; generation: number; memories: MemoryObject[]; tombstones: string[]; }
class MoryDatabase extends Dexie {
  memories!: Table<MemoryObject,string>;
  meta!: Table<Meta,string>;
  tombstones!: Table<{id:string},string>;
  versions!: Table<Version,number>;
  constructor() {
    super("mory");
    this.version(1).stores({memories:"id, contentHash, capturedAt, source, type, *tags"});
    this.version(2).stores({memories:"id, contentHash, capturedAt, source, type, *tags",meta:"key",tombstones:"id",versions:"++key, memoryId"});
  }
}
export const db=new MoryDatabase();
export class DuplicateMemoryError extends Error {}
let runtimePromise:Promise<{apiUrl:string;token:string}|undefined>|undefined;
async function getRuntime() {
  if(typeof window==="undefined")return undefined;
  if(!runtimePromise)runtimePromise=fetch("/runtime-config").then(async response=>{
    if(!response.ok)return undefined;
    const value=await response.json();
    if(typeof value?.apiUrl!=="string"||typeof value?.token!=="string")return undefined;
    return window.location.port==="5173"?{...value,apiUrl:window.location.origin}:value;
  }).catch(()=>undefined);
  return runtimePromise;
}
async function apiRequest<T>(path:string,init:RequestInit={}):Promise<T> {
  const runtime=await getRuntime();if(!runtime)throw new Error("Mory API is not available.");
  const response=await fetch(runtime.apiUrl+path,{...init,headers:{authorization:`Bearer ${runtime.token}`,"content-type":"application/json",...init.headers},signal:AbortSignal.timeout(30_000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||`Mory API error (${response.status})`);
  return result as T;
}
const tables=()=>[db.memories,db.meta,db.tombstones,db.versions];
async function generation(){return Number((await db.meta.get("generation"))?.value||0);}
async function bump(){await db.meta.put({key:"generation",value:String(await generation()+1)});}
async function write(memory:MemoryObject,action:string){
  const prior=await db.memories.get(memory.id);
  if(prior&&!await db.versions.where("memoryId").equals(memory.id).count())await db.versions.add({memoryId:prior.id,memory:prior,action:"MIGRATE"});
  const next={...memory,revision:(prior?.revision||0)+1};
  await db.memories.put(next);await db.versions.add({memoryId:next.id,memory:next,action});return next;
}
async function localSnapshot():Promise<RepositorySnapshot>{
  return db.transaction("r",db.memories,db.meta,db.tombstones,async()=>({generation:await generation(),memories:await db.memories.orderBy("capturedAt").reverse().toArray(),tombstones:(await db.tombstones.toArray()).map(row=>row.id)}));
}
async function migrateTombstones(){
  const key="legacyTombstones";
  if(await db.meta.get(key))return;
  const parsed=JSON.parse(localStorage.getItem("mory.sync.tombstones")||"[]");
  if(!Array.isArray(parsed)||parsed.some(id=>typeof id!=="string"))throw new Error("Invalid legacy deletion history.");
  await db.transaction("rw",db.meta,db.tombstones,async()=>{await db.tombstones.bulkPut(parsed.map(id=>({id})));await db.meta.put({key,value:"1"});});
}
let initialization:Promise<void>|undefined;
async function initializeLocal(){
  if(!initialization)initialization=(async()=>{
    await migrateTombstones();
    if(await db.meta.get("canonicalSchema2"))return;
    const base=await localSnapshot();
    const memories=await Promise.all(base.memories.map(normalizeMemory));
    await db.transaction("rw",tables(),async()=>{
      if(await generation()!==base.generation)throw new Error("Repository changed during migration. Reload to retry.");
      for(const memory of memories){await db.memories.put(memory);if(!await db.versions.where("memoryId").equals(memory.id).count())await db.versions.add({memoryId:memory.id,memory,action:"MIGRATE"});}
      await db.meta.put({key:"canonicalSchema2",value:"1"});await bump();
    });
  })().catch(error=>{initialization=undefined;throw error;});
  return initialization;
}
export async function loadRepositorySnapshot():Promise<RepositorySnapshot>{
  await initializeLocal();
  if(await getRuntime()){
    let snapshot=await apiRequest<RepositorySnapshot>("/v1/snapshot");
    const key=`migrated:${snapshot.repositoryId}`;
    if(!await db.meta.get(key)){
      const legacy=await db.memories.toArray();
      const tombstones=(await db.tombstones.toArray()).map(row=>row.id);
      if(legacy.length||tombstones.length){
        // A partial migration preserves both copies of a divergent id and all deletion intent.
        const merged=mergeSnapshots({memories:legacy,tombstones},snapshot);
        snapshot=await apiRequest<RepositorySnapshot>("/v1/sync",{method:"POST",body:JSON.stringify({...merged,expectedGeneration:snapshot.generation})});
      }
      await db.meta.put({key,value:"1"});
    }
    return {...snapshot,memories:await Promise.all(snapshot.memories.map(normalizeMemory))};
  }
  const snapshot=await localSnapshot();
  return {...snapshot,memories:await Promise.all(snapshot.memories.map(normalizeMemory))};
}
export async function loadMemories():Promise<MemoryObject[]>{return (await loadRepositorySnapshot()).memories;}
export async function saveMemory(input:MemoryObject):Promise<MemoryObject>{
  await initializeLocal();
  const memory=await normalizeMemory(input);
  if(await getRuntime()){
    const result=await apiRequest<{memory:MemoryObject;duplicate:boolean}>("/v1/memories",{method:"POST",body:JSON.stringify(memory)});
    if(result.duplicate)throw new DuplicateMemoryError("This memory already exists in your repository.");
    return normalizeMemory(result.memory);
  }
  return db.transaction("rw",tables(),async()=>{
    if(await db.tombstones.get(memory.id))throw new Error("This memory was deleted. Import it with a new id.");
    if(await db.memories.get(memory.id)||await db.memories.where("contentHash").equals(memory.contentHash).first())throw new DuplicateMemoryError("This memory already exists in your repository.");
    const saved=await write(memory,"ADD");await bump();return saved;
  });
}
export async function applyRepositorySnapshot(input:RepositorySnapshot,expectedGeneration:number):Promise<RepositorySnapshot>{
  const memories=await Promise.all(input.memories.map(normalizeMemory));
  if(await getRuntime())return apiRequest<RepositorySnapshot>("/v1/sync",{method:"POST",body:JSON.stringify({...input,memories,expectedGeneration})});
  return db.transaction("rw",tables(),async()=>{
    if(await generation()!==expectedGeneration)throw new Error("Repository changed during sync. Retry to include your latest edits.");
    const tombstones=new Set([...input.tombstones,...(await db.tombstones.toArray()).map(row=>row.id)]);
    for(const memory of memories){
      if(tombstones.has(memory.id))continue;
      const current=await db.memories.get(memory.id);
      if(!current||memoryFingerprint(current)!==memoryFingerprint(memory))await write(memory,"SYNC");
    }
    for(const id of tombstones){
      const current=await db.memories.get(id);
      if(current){await db.versions.add({memoryId:id,memory:current,action:"DELETE"});await db.memories.delete(id);}
      await db.tombstones.put({id});
    }
    await bump();return localSnapshot();
  });
}
export async function upsertMemories(memories:MemoryObject[]):Promise<void>{
  const snapshot=await loadRepositorySnapshot();
  await applyRepositorySnapshot({...snapshot,memories},snapshot.generation);
}
export async function importMemoryBatch(inputs:MemoryObject[]):Promise<{addedCount:number;duplicateCount:number}>{
  await initializeLocal();
  const memories=await Promise.all(inputs.map(normalizeMemory));
  if(await getRuntime())return apiRequest("/v1/import",{method:"POST",body:JSON.stringify({memories})});
  return db.transaction("rw",tables(),async()=>{
    let addedCount=0,duplicateCount=0;
    for(const memory of memories){
      if(await db.tombstones.get(memory.id))throw new Error("Import contains a deleted id. Restore with a new id.");
      const current=await db.memories.get(memory.id);
      if(current&&memoryFingerprint(current)!==memoryFingerprint(memory))throw new Error("Import conflicts with an existing memory id.");
      if(current||await db.memories.where("contentHash").equals(memory.contentHash).first()){duplicateCount++;continue;}
      await write(memory,"IMPORT");addedCount++;
    }
    await bump();return {addedCount,duplicateCount};
  });
}
export async function updateMemory(input:MemoryObject):Promise<MemoryObject>{
  await initializeLocal();
  const memory=await normalizeMemory({...input,updatedAt:new Date().toISOString()});
  if(await getRuntime()){
    const result=await apiRequest<{memory:MemoryObject}>(`/v1/memories/${encodeURIComponent(memory.id)}`,{method:"PATCH",body:JSON.stringify({...memory,payload:{...memory.payload,url:memory.payload.url??null},expectedRevision:input.revision})});
    return normalizeMemory(result.memory);
  }
  return db.transaction("rw",tables(),async()=>{
    const current=await db.memories.get(memory.id);
    if(!current||await db.tombstones.get(memory.id))throw new Error("Memory is no longer available.");
    if((current.revision||0)!==(input.revision||0))throw new Error("Memory changed. Reload before saving.");
    const saved=await write(memory,"UPDATE");await bump();return saved;
  });
}
export async function deleteMemory(id:string,revision?:number):Promise<void>{
  await initializeLocal();
  if(await getRuntime()){await apiRequest(`/v1/memories/${encodeURIComponent(id)}`,{method:"DELETE",body:JSON.stringify({expectedRevision:revision})});return;}
  await db.transaction("rw",tables(),async()=>{
    const current=await db.memories.get(id);
    if(current){if(revision!==undefined&&(current.revision||0)!==revision)throw new Error("Memory changed. Reload before deleting.");await db.versions.add({memoryId:id,memory:current,action:"DELETE"});await db.memories.delete(id);}
    await db.tombstones.put({id});await bump();
  });
}
export async function clearMemories():Promise<void>{
  await initializeLocal();
  if(await getRuntime()){await apiRequest("/v1/clear",{method:"POST"});return;}
  await db.transaction("rw",tables(),async()=>{
    for(const memory of await db.memories.toArray()){await db.versions.add({memoryId:memory.id,memory,action:"DELETE"});await db.tombstones.put({id:memory.id});}
    await db.memories.clear();await bump();
  });
}
