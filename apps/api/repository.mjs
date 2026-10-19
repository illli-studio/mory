import { DatabaseSync, backup } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { normalizeMemory, memoryFingerprint, mergeSnapshots } from "@mory/memory-core/protocol";

export class RepositoryError extends Error {
  constructor(status,message) { super(message); this.status=status; }
}
export function tokens(text) {
  const words=text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu)||[];
  for(const run of text.match(/\p{Script=Han}+/gu)||[]) {
    for(let i=0;i<run.length-1;i++)words.push(run.slice(i,i+2));
    if(run.length===1)words.push(run);
  }
  return [...new Set(words)];
}
export async function openRepository(path) {
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY,text TEXT NOT NULL,title TEXT NOT NULL,kind TEXT NOT NULL,source TEXT NOT NULL,actor_type TEXT,actor_id TEXT,scope_json TEXT NOT NULL,metadata_json TEXT NOT NULL,tags_json TEXT NOT NULL,hash TEXT NOT NULL,confidence REAL NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,source_event_ids_json TEXT NOT NULL,embedding_json TEXT,document_json TEXT,revision INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS raw_events(id TEXT PRIMARY KEY,content TEXT NOT NULL,source TEXT,actor_json TEXT,scope_json TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,type TEXT NOT NULL,memory_id TEXT,source_event_id TEXT,old_hash TEXT,new_hash TEXT,actor_json TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS relations(id TEXT PRIMARY KEY,from_memory_id TEXT NOT NULL,to_memory_id TEXT NOT NULL,type TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memory_versions(memory_id TEXT NOT NULL,revision INTEGER NOT NULL,document_json TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(memory_id,revision));
    CREATE TABLE IF NOT EXISTS memory_entities(memory_id TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(memory_id,name));
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_search USING fts5(memory_id UNINDEXED,title,text,tags,tokens);
    CREATE INDEX IF NOT EXISTS memories_hash_idx ON memories(hash);
    CREATE INDEX IF NOT EXISTS memories_status_time_idx ON memories(status,updated_at,id);`);
  const schema=Number(db.prepare("SELECT value FROM schema_meta WHERE key='schemaVersion'").get()?.value||0);
  if(schema>2) {db.close();throw new Error("Database schema is newer than this runtime.");}
  const columns=db.prepare("PRAGMA table_info(memories)").all().map(row=>row.name);
  if(!columns.includes("document_json"))db.exec("ALTER TABLE memories ADD COLUMN document_json TEXT");
  if(!columns.includes("revision"))db.exec("ALTER TABLE memories ADD COLUMN revision INTEGER NOT NULL DEFAULT 1");
  const transaction=fn=>{db.exec("BEGIN IMMEDIATE");try{const value=fn();db.exec("COMMIT");return value;}catch(error){db.exec("ROLLBACK");throw error;}};
  function fromRow(row) {return row?.document_json?JSON.parse(row.document_json):undefined;}
  const get=id=>fromRow(db.prepare("SELECT document_json FROM memories WHERE id=?").get(id));
  const generation=()=>Number(db.prepare("SELECT value FROM schema_meta WHERE key='generation'").get()?.value||0);
  const bump=()=>db.prepare("INSERT INTO schema_meta VALUES ('generation','1') ON CONFLICT(key) DO UPDATE SET value=CAST(value AS INTEGER)+1").run();
  function index(memory) {
    db.prepare("DELETE FROM memory_search WHERE memory_id=?").run(memory.id);
    db.prepare("DELETE FROM memory_entities WHERE memory_id=?").run(memory.id);
    if(memory.status!=="active")return;
    const text=`${memory.payload.title} ${memory.payload.content} ${JSON.stringify(memory.fields)} ${JSON.stringify(memory.metadata)}`;
    db.prepare("INSERT INTO memory_search VALUES (?,?,?,?,?)").run(memory.id,memory.payload.title,memory.payload.content,memory.tags.join(" "),tokens(text).join(" "));
    const segments=new Intl.Segmenter("zh",{granularity:"word"}).segment(text);
    for(const name of [...new Set([...segments].filter(s=>s.isWordLike&&s.segment.length>=2&&(/\p{Script=Han}/u.test(s.segment)||/^[A-Z]/.test(s.segment))).map(s=>s.segment))].slice(0,40))db.prepare("INSERT OR IGNORE INTO memory_entities VALUES (?,?)").run(memory.id,name);
  }
  function write(memory,action,keepRevision=false) {
    const prior=get(memory.id);
    const next={...memory,revision:keepRevision?Math.max(1,memory.revision):(prior?.revision||0)+1};
    db.prepare(`INSERT INTO memories(id,text,title,kind,source,actor_type,actor_id,scope_json,metadata_json,tags_json,hash,confidence,status,created_at,updated_at,source_event_ids_json,embedding_json,document_json,revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET text=excluded.text,title=excluded.title,kind=excluded.kind,source=excluded.source,actor_type=excluded.actor_type,actor_id=excluded.actor_id,scope_json=excluded.scope_json,metadata_json=excluded.metadata_json,tags_json=excluded.tags_json,hash=excluded.hash,confidence=excluded.confidence,status=excluded.status,updated_at=excluded.updated_at,source_event_ids_json=excluded.source_event_ids_json,embedding_json=excluded.embedding_json,document_json=excluded.document_json,revision=excluded.revision`).run(next.id,next.payload.content,next.payload.title,next.kind,next.source,next.actor.type,next.actor.id||null,JSON.stringify(next.scope),JSON.stringify(next.metadata),JSON.stringify(next.tags),next.contentHash,1,next.status,next.capturedAt,next.updatedAt,JSON.stringify(next.sourceEventIds),JSON.stringify(next.embedding||null),JSON.stringify(next),next.revision);
    db.prepare("INSERT INTO memory_versions VALUES (?,?,?,?,?)").run(next.id,next.revision,JSON.stringify(next),action,next.updatedAt);
    db.prepare("INSERT INTO events VALUES (?,?,?,?,?,?,?,?)").run(randomUUID(),action,next.id,next.sourceEventIds?.at(-1)||null,prior?.contentHash||null,next.contentHash,JSON.stringify(next.actor),next.updatedAt);
    index(next);bump();return next;
  }
  // Preserve legacy tables and capture their surviving originals before the first update.
  const legacy=await Promise.all(db.prepare("SELECT * FROM memories WHERE document_json IS NULL").all().map(row=>normalizeMemory({id:row.id,text:row.text,title:row.title,source:row.source,kind:row.kind,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,scope:JSON.parse(row.scope_json),metadata:JSON.parse(row.metadata_json),tags:JSON.parse(row.tags_json),actor:{type:row.actor_type||"agent",...(row.actor_id?{id:row.actor_id}:{})},sourceEventIds:JSON.parse(row.source_event_ids_json),embedding:JSON.parse(row.embedding_json||"null")})));
  transaction(()=>{
    for(const memory of legacy)write(memory,"MIGRATE");
    db.prepare("INSERT INTO schema_meta VALUES ('schemaVersion','2') ON CONFLICT(key) DO UPDATE SET value='2'").run();
    db.prepare("INSERT OR IGNORE INTO schema_meta VALUES ('repositoryId',?)").run(randomUUID());
  });
  const repositoryId=db.prepare("SELECT value FROM schema_meta WHERE key='repositoryId'").get().value;
  function list(scope={},includeDeleted=false) {
    if(!scope||typeof scope!=="object"||Array.isArray(scope))throw new RepositoryError(400,"Invalid scope.");
    const clauses=includeDeleted?[]:["status='active'"];const args=[];
    for(const [key,value]of Object.entries(scope)){
      if(value===null||value===undefined)continue;
      if(!/^[a-zA-Z0-9_-]+$/.test(key)||typeof value!=="string")throw new RepositoryError(400,"Invalid scope.");
      clauses.push("json_extract(scope_json,?)=?");args.push(`$.${key}`,value);
    }
    return db.prepare(`SELECT document_json FROM memories ${clauses.length?`WHERE ${clauses.join(" AND ")}`:""} ORDER BY updated_at DESC,id`).all(...args).map(fromRow);
  }
  const snapshot=()=>({schemaVersion:2,repositoryId,generation:generation(),exportedAt:new Date().toISOString(),memories:list(),tombstones:list({},true).filter(m=>m.status!=="active").map(m=>m.id)});
  const duplicate=memory=>db.prepare("SELECT document_json FROM memories WHERE hash=? AND status='active'").all(memory.contentHash).map(fromRow).find(other=>memoryFingerprint(other)===memoryFingerprint(memory));
  async function create(input) {
    const memory=await normalizeMemory(input);
    return transaction(()=>{
      const prior=get(memory.id);
      if(db.prepare("SELECT value FROM schema_meta WHERE key=?").get(`tombstone:${memory.id}`))throw new RepositoryError(409,"This memory was deleted. Restore as a new id.");
      if(prior?.status!=="active"&&prior)throw new RepositoryError(409,"This memory was deleted. Restore as a new id.");
      if(prior&&memoryFingerprint(prior)!==memoryFingerprint(memory))throw new RepositoryError(409,"Memory id already has different content.");
      const existing=prior||duplicate(memory);
      if(existing)return {memory:existing,duplicate:true};
      return {memory:write({...memory,updatedAt:new Date().toISOString()},"ADD"),duplicate:false};
    });
  }
  async function update(id,input,expectedRevision) {
    const prior=get(id);if(!prior)throw new RepositoryError(404,"Memory not found.");
    if(prior.status!=="active")throw new RepositoryError(409,"Memory is no longer active.");
    const payload={...prior.payload,...input.payload,...(input.text!==undefined?{content:input.text}:{}),...(input.content!==undefined?{content:input.content}:{}),...(input.title!==undefined?{title:input.title}:{})};
    if(input.payload?.url===null)delete payload.url;
    const memory=await normalizeMemory({...prior,...input,payload,...(input.metadata!==undefined&&!input.fields?{fields:undefined}:{}),id,capturedAt:prior.capturedAt,updatedAt:new Date().toISOString()});
    if(payload.content!==prior.payload.content && input.embedding===undefined)delete memory.embedding;
    return transaction(()=>{
      if(get(id).revision!==prior.revision || (expectedRevision!==undefined&&expectedRevision!==prior.revision))throw new RepositoryError(409,"Memory changed. Reload before saving.");
      return write(memory,memory.status==="deleted"?"DELETE":"UPDATE");
    });
  }
  async function importMemories(input) {
    if(!Array.isArray(input)||input.length>10000)throw new RepositoryError(400,"Import requires at most 10000 memories.");
    const prepared=await Promise.all(input.map(normalizeMemory));
    return transaction(()=>{
      const memories=[];let duplicateCount=0,deletedCount=0;
      for(const memory of prepared){
        const existing=get(memory.id);
        if((existing?.status!=="active"&&existing)||db.prepare("SELECT value FROM schema_meta WHERE key=?").get(`tombstone:${memory.id}`)){deletedCount++;continue;}
        if(existing&&memoryFingerprint(existing)!==memoryFingerprint(memory))throw new RepositoryError(409,"Import conflicts with an existing id. Use sync to retain both copies.");
        if(existing||duplicate(memory)){duplicateCount++;continue;}
        memories.push(write(memory,"IMPORT"));
      }
      return {memories,addedCount:memories.length,duplicateCount,deletedCount};
    });
  }
  async function reconcile(input) {
    if(!Array.isArray(input.memories)||!Array.isArray(input.tombstones)||input.tombstones.some(id=>typeof id!=="string"))throw new RepositoryError(400,"Invalid sync snapshot.");
    const prepared=await Promise.all(input.memories.map(normalizeMemory));
    const base=fullSnapshot();
    if(input.expectedGeneration!==undefined&&input.expectedGeneration!==base.generation)throw new RepositoryError(409,"Repository changed during sync. Retry.");
    const merged=mergeSnapshots(base,{memories:prepared,tombstones:input.tombstones});
    const deleted=await Promise.all(merged.tombstones.map(id=>get(id)).filter(m=>m&&m.status==="active").map(m=>normalizeMemory({...m,status:"deleted",updatedAt:new Date().toISOString()})));
    return transaction(()=>{
      if(generation()!==base.generation)throw new RepositoryError(409,"Repository changed during sync. Retry.");
      for(const memory of merged.memories){const current=get(memory.id);if(!current||memoryFingerprint(current)!==memoryFingerprint(memory))write(memory,"SYNC");}
      for(const memory of deleted)write(memory,"DELETE");
      // Retain remote tombstones even when this repository never had the content.
      for(const id of merged.tombstones)db.prepare("INSERT OR IGNORE INTO schema_meta VALUES (?,?)").run(`tombstone:${id}`,id);
      bump();return fullSnapshot();
    });
  }
  function fullSnapshot() {
    const result=snapshot();
    result.tombstones=[...new Set([...result.tombstones,...db.prepare("SELECT value FROM schema_meta WHERE key LIKE 'tombstone:%'").all().map(r=>r.value)])];
    return result;
  }
  function search(query,scope={},limit=10) {
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new RepositoryError(400,"Limit must be 1 to 100.");
    const words=tokens(query).slice(0,64);
    if(!words.length)return list(scope).slice(0,limit).map(memory=>({memory,score:0}));
    const match=words.map(word=>`"${word.replaceAll('"','""')}"`).join(" OR ");
    const args=[match],clauses=["memory_search MATCH ?","m.status='active'"];
    for(const[key,value]of Object.entries(scope)){
      if(!/^[a-zA-Z0-9_-]+$/.test(key)||typeof value!=="string")throw new RepositoryError(400,"Invalid scope.");
      clauses.push("json_extract(m.scope_json,?)=?");args.push(`$.${key}`,value);
    }
    return db.prepare(`SELECT m.document_json,bm25(memory_search,0,4,1,2,1) AS rank FROM memory_search JOIN memories m ON m.id=memory_search.memory_id WHERE ${clauses.join(" AND ")} ORDER BY rank,m.id LIMIT ?`).all(...args,limit).map(row=>({memory:fromRow(row),score:-row.rank}));
  }
  async function remember(event,inputs) {
    const prepared=await Promise.all(inputs.map(normalizeMemory));
    return transaction(()=>{
      db.prepare("INSERT INTO raw_events VALUES (?,?,?,?,?,?)").run(event.id,event.text,event.source,JSON.stringify(event.actor),JSON.stringify(event.scope),event.createdAt);
      const memories=[],duplicates=[];
      for(const memory of prepared){const existing=duplicate(memory);if(existing){duplicates.push(existing);continue;}memories.push(write(memory,"ADD"));}
      return {memories,duplicates};
    });
  }
  function archive(connection=db) {
    const all=connection.prepare("SELECT document_json FROM memories").all().map(fromRow);
    return {schemaVersion:2,exportedAt:new Date().toISOString(),memories:all.filter(m=>m.status==="active"),tombstones:[...new Set([...all.filter(m=>m.status!=="active").map(m=>m.id),...connection.prepare("SELECT value FROM schema_meta WHERE key LIKE 'tombstone:%'").all().map(row=>row.value)])],
      records:all,history:connection.prepare("SELECT * FROM memory_versions").all(),rawEvents:connection.prepare("SELECT * FROM raw_events").all(),events:connection.prepare("SELECT * FROM events").all(),relations:connection.prepare("SELECT * FROM relations").all()};
  }
  async function restore(input) {
    if(!Array.isArray(input.records))return importMemories(input.memories);
    const records=await Promise.all(input.records.map(normalizeMemory));
    const history=await Promise.all((input.history||[]).map(async row=>({...row,memory:await normalizeMemory(JSON.parse(row.document_json))})));
    return transaction(()=>{
      for(const memory of records){const current=get(memory.id);if(current&&(memoryFingerprint(current)!==memoryFingerprint(memory)||current.revision!==memory.revision))throw new RepositoryError(409,"Restore conflicts with existing data.");if(!current)write(memory,"RESTORE",true);}
      for(const row of history){
        if(row.memory.id!==row.memory_id||row.memory.revision!==row.revision)throw new RepositoryError(400,"Invalid history record.");
        const existing=db.prepare("SELECT document_json FROM memory_versions WHERE memory_id=? AND revision=?").get(row.memory_id,row.revision);
        if(existing&&memoryFingerprint(JSON.parse(existing.document_json))!==memoryFingerprint(row.memory))throw new RepositoryError(409,"History conflict.");
        db.prepare("INSERT OR REPLACE INTO memory_versions VALUES (?,?,?,?,?)").run(row.memory_id,row.revision,JSON.stringify(row.memory),row.action,row.created_at);
      }
      for(const memory of records)db.prepare("UPDATE memories SET revision=?,document_json=? WHERE id=?").run(memory.revision||1,JSON.stringify({...memory,revision:memory.revision||1}),memory.id);
      for(const row of input.rawEvents||[])db.prepare("INSERT OR IGNORE INTO raw_events VALUES (?,?,?,?,?,?)").run(row.id,row.content,row.source,row.actor_json,row.scope_json,row.created_at);
      for(const row of input.events||[])db.prepare("INSERT OR IGNORE INTO events VALUES (?,?,?,?,?,?,?,?)").run(row.id,row.type,row.memory_id,row.source_event_id,row.old_hash,row.new_hash,row.actor_json,row.created_at);
      for(const row of input.relations||[])db.prepare("INSERT OR IGNORE INTO relations VALUES (?,?,?,?,?)").run(row.id,row.from_memory_id,row.to_memory_id,row.type,row.created_at);
      for(const id of input.tombstones||[]){if(typeof id!=="string")throw new RepositoryError(400,"Invalid tombstone.");db.prepare("INSERT OR IGNORE INTO schema_meta VALUES (?,?)").run(`tombstone:${id}`,id);}
      return {addedCount:records.length,duplicateCount:0};
    });
  }
  return {db,get,list,create,update,importMemories,reconcile,search,remember,archive,restore,snapshot:fullSnapshot,
    history:id=>db.prepare("SELECT document_json,action,created_at FROM memory_versions WHERE memory_id=? ORDER BY revision").all(id).map(row=>({memory:JSON.parse(row.document_json),action:row.action,createdAt:row.created_at})),
    backup:async file=>{await backup(db,file);const copy=new DatabaseSync(file,{readOnly:true});try{return archive(copy);}finally{copy.close();}},close:()=>db.close()};
}
