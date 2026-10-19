import { randomBytes,randomUUID,timingSafeEqual } from "node:crypto";
import { mkdir,readFile } from "node:fs/promises";
import { dirname,resolve,sep } from "node:path";
import { createServer } from "node:http";
import { openRepository,RepositoryError } from "./repository.mjs";
import { backupGithub } from "./github-backup.mjs";

const port=Number(process.env.MORY_PORT||8787);
const token=process.env.MORY_API_TOKEN||randomBytes(24).toString("hex");
const databasePath=resolve(process.env.MORY_DATABASE||"./data/mory.sqlite");
const webDist=process.env.MORY_WEB_DIST?resolve(process.env.MORY_WEB_DIST):undefined;
await mkdir(dirname(databasePath),{recursive:true});
const repository=await openRepository(databasePath);
const wire=memory=>({...memory,text:memory.payload.content,title:memory.payload.title,hash:memory.contentHash,createdAt:memory.capturedAt});
const textOf=value=>typeof value==="string"?value.trim():Array.isArray(value)?value.map(m=>`${m.role||"user"}: ${m.content||""}`).join("\n").trim():"";
async function modelRequest(path,payload,embedding=false) {
  const key=embedding?process.env.MORY_EMBEDDING_API_KEY||process.env.MORY_LLM_API_KEY:process.env.MORY_LLM_API_KEY;
  if(!key)return undefined;
  const base=(embedding?process.env.MORY_EMBEDDING_BASE_URL||process.env.MORY_LLM_BASE_URL:process.env.MORY_LLM_BASE_URL)||"https://api.openai.com/v1";
  const response=await fetch(base.replace(/\/$/,"")+path,{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw new RepositoryError(502,`Model request failed (${response.status}).`);
  return response.json();
}
async function embed(text) {
  const result=await modelRequest("/embeddings",{model:process.env.MORY_EMBEDDING_MODEL||"text-embedding-3-small",input:text},true);
  return result?.data?.[0]?.embedding;
}
function cosine(a,b) {
  if(!Array.isArray(a)||!Array.isArray(b)||!a.length||a.length!==b.length)return 0;
  let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;}
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
async function search(query,scope,limit) {
  if(typeof query!=="string")throw new RepositoryError(400,"Query must be text.");
  const ranked=repository.search(query,scope,limit);
  const vector=query?await embed(query).catch(()=>undefined):undefined;
  if(!vector)return ranked;
  const scores=new Map(ranked.map((item,i)=>[item.memory.id,{memory:item.memory,score:1/(i+1)}]));
  for(const memory of repository.list(scope)){const similarity=cosine(vector,memory.embedding);if(similarity>0.2)scores.set(memory.id,{memory,score:(scores.get(memory.id)?.score||0)+similarity});}
  return [...scores.values()].sort((a,b)=>b.score-a.score).slice(0,limit);
}
function authorized(request) {
  const supplied=Buffer.from((request.headers.authorization||"").replace(/^Bearer\s+/i,"")),expected=Buffer.from(token);
  return supplied.length===expected.length&&timingSafeEqual(supplied,expected);
}
function send(response,status,result) {
  response.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":process.env.MORY_CORS_ORIGIN||`http://127.0.0.1:${port}`,"access-control-allow-headers":"authorization, content-type, if-match, x-request-id","access-control-allow-methods":"GET, POST, PATCH, DELETE, OPTIONS"});
  response.end(status===204?undefined:JSON.stringify(result));
}
async function requestBody(request) {
  const maxBytes=16*1024*1024;let size=0;const chunks=[];
  if(Number(request.headers["content-length"]||0)>maxBytes)throw new RepositoryError(413,"Request exceeds 16 MiB limit.");
  for await(const chunk of request){size+=chunk.length;if(size>maxBytes)throw new RepositoryError(413,"Request exceeds 16 MiB limit.");chunks.push(chunk);}
  let input;try{input=size?JSON.parse(Buffer.concat(chunks).toString("utf8")):{};}catch{throw new RepositoryError(400,"Invalid JSON.");}
  if(!input||typeof input!=="object"||Array.isArray(input))throw new RepositoryError(400,"Expected a JSON object.");
  return input;
}
const server=createServer(async(request,response)=>{
  try {
    if(request.method==="OPTIONS")return send(response,204);
    const url=new URL(request.url,"http://localhost");
    if(url.pathname==="/health")return send(response,200,{ok:true,service:"mory-api",storage:"sqlite",schemaVersion:2,search:"fts5-bm25+optional-vector"});
    if(url.pathname==="/runtime-config")return send(response,200,{apiUrl:`http://127.0.0.1:${port}`,token});
    if(request.method==="GET"&&!url.pathname.startsWith("/v1/")&&await sendWeb(response,url.pathname))return;
    if(!authorized(request))throw new RepositoryError(401,"Invalid token.");
    if(request.method==="GET"&&url.pathname==="/v1/memories"){
      const scope=Object.fromEntries(["userId","projectId"].filter(key=>url.searchParams.has(key)).map(key=>[key,url.searchParams.get(key)]));
      const limit=Number(url.searchParams.get("limit")||50),offset=Number(url.searchParams.get("offset")||0);
      if(!Number.isSafeInteger(limit)||limit<1||limit>200||!Number.isSafeInteger(offset)||offset<0)throw new RepositoryError(400,"Invalid pagination.");
      const all=repository.list(scope);return send(response,200,{memories:all.slice(offset,offset+limit).map(wire),total:all.length,offset,nextOffset:offset+limit<all.length?offset+limit:null});
    }
    if(request.method==="GET"&&url.pathname==="/v1/snapshot")return send(response,200,repository.snapshot());
    if(request.method==="POST"&&url.pathname==="/v1/sync")return send(response,200,await repository.reconcile(await requestBody(request)));
    if(request.method==="POST"&&(url.pathname==="/v1/memories/search"||url.pathname==="/v1/context")){
      const input=await requestBody(request);const results=await search(input.query??"",input.scope??{},input.limit??(url.pathname==="/v1/context"?12:10));
      const memories=results.map(item=>wire(item.memory));
      return send(response,200,url.pathname==="/v1/context"?{query:input.query||"",memories,context:memories.map(m=>`- ${m.text}`).join("\n")}:{results:results.map(item=>({...item,memory:wire(item.memory)}))});
    }
    if(request.method==="POST"&&url.pathname==="/v1/memories/remember"){
      const input=await requestBody(request),text=textOf(input.messages||input.text||input.content);
      if(!text)throw new RepositoryError(400,"Messages or text is required.");
      const related=repository.search(text,input.scope||{},10).map(item=>({id:item.memory.id,text:item.memory.payload.content}));
      const extraction=await modelRequest("/chat/completions",{model:process.env.MORY_LLM_MODEL||"gpt-4o-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:"Extract durable memories. Exclude secrets, temporary reasoning and filler. Return JSON {memories:[{text,kind}]}. Existing memories are read-only context; do not supersede them."},{role:"user",content:JSON.stringify({newInput:text,relatedMemories:related})}]});
      const candidates=extraction?JSON.parse(extraction.choices?.[0]?.message?.content||"{}").memories:text.split(/(?<=[.!?。！？])\s+|\n+/u).map(s=>s.trim()).filter(Boolean).slice(0,8).map(text=>({text,kind:input.kind||"note"}));
      if(!Array.isArray(candidates)||candidates.length>100)throw new RepositoryError(502,"Invalid extraction result.");
      const event={id:randomUUID(),text,source:input.source||"agent",actor:input.actor||{type:"agent",id:"api"},scope:input.scope||{},createdAt:new Date().toISOString()};
      const prepared=await Promise.all(candidates.map(async candidate=>({...candidate,source:event.source,actor:event.actor,scope:event.scope,isPrivate:input.isPrivate??false,metadata:{...(input.metadata||{}),...(candidate.metadata||{})},sourceEventIds:[event.id],embedding:await embed(candidate.text).catch(()=>undefined)})));
      const result=await repository.remember(event,prepared);
      return send(response,201,{eventId:event.id,extractor:extraction?"llm":"local-fallback",addedCount:result.memories.length,memories:result.memories.map(wire),duplicates:result.duplicates.map(wire)});
    }
    if(request.method==="POST"&&url.pathname==="/v1/memories"){
      const input=await requestBody(request);
      input.embedding=await embed(input.payload?.content??input.text??input.content??"").catch(()=>undefined);
      const result=await repository.create(input);return send(response,result.duplicate?200:201,{...result,memory:wire(result.memory)});
    }
    const history=url.pathname.match(/^\/v1\/memories\/([^/]+)\/history$/);
    if(history&&request.method==="GET")return send(response,200,{versions:repository.history(decodeURIComponent(history[1]))});
    const match=url.pathname.match(/^\/v1\/memories\/([^/]+)$/);
    if(match){
      const id=decodeURIComponent(match[1]),memory=repository.get(id);
      if(!memory)throw new RepositoryError(404,"Memory not found.");
      if(request.method==="GET")return send(response,200,{memory:wire(memory)});
      if(request.method==="PATCH"||request.method==="DELETE"){
        const input=await requestBody(request);
        const expected=input.expectedRevision??input.revision??(request.headers["if-match"]?Number(request.headers["if-match"].replaceAll('"','')):undefined);
        const nextText=input.text??input.content??input.payload?.content??memory.payload.content;
        if(request.method==="PATCH"&&nextText!==memory.payload.content)input.embedding=(await embed(nextText).catch(()=>undefined))??null;
        // Legacy clients can omit a revision; the repository still checks for changes during the request.
        const next=await repository.update(id,request.method==="DELETE"?{status:"deleted"}:input,expected);
        return send(response,200,{ok:true,memory:wire(next)});
      }
    }
    if(request.method==="POST"&&url.pathname==="/v1/clear"){
      const snapshot=repository.snapshot();return send(response,200,await repository.reconcile({memories:[],tombstones:[...snapshot.tombstones,...snapshot.memories.map(m=>m.id)],expectedGeneration:snapshot.generation}));
    }
    if(request.method==="GET"&&url.pathname==="/v1/export")return send(response,200,repository.archive());
    if(request.method==="POST"&&url.pathname==="/v1/import")return send(response,201,await repository.restore(await requestBody(request)));
    if(request.method==="POST"&&url.pathname==="/v1/backup/github")return send(response,200,await backupGithub(repository,await requestBody(request)));
    throw new RepositoryError(404,"Not found.");
  }catch(error){send(response,error.status||400,{error:error.message||"Bad request."});}
});
server.requestTimeout=30_000;server.headersTimeout=10_000;
server.listen(port,"127.0.0.1",()=>console.log(`Mory API listening on http://127.0.0.1:${port} (${databasePath})`));
for(const signal of ["SIGINT","SIGTERM"])process.once(signal,()=>server.close(()=>{repository.close();process.exit(0);}));
async function sendWeb(response, pathname) {
  if (!webDist) return false;
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const safePath = resolve(webDist, relative);
  if (safePath !== webDist && !safePath.startsWith(webDist + sep)) return false;
  try {
    const body = await readFile(safePath);
    const type = safePath.endsWith(".html") ? "text/html; charset=utf-8" : safePath.endsWith(".js") ? "text/javascript; charset=utf-8" : safePath.endsWith(".css") ? "text/css; charset=utf-8" : safePath.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
    response.writeHead(200, { "content-type": type, "cache-control": safePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable" });
    response.end(body);
    return true;
  } catch {
    if (pathname !== "/" && !pathname.includes(".")) return sendWeb(response, "/");
    return false;
  }
}
