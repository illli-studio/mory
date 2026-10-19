import { mkdtemp,readFile,unlink,rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RepositoryError } from "./repository.mjs";

export async function backupGithub(repository,input) {
  for(const key of ["token","owner","repo"])if(typeof input[key]!=="string"||!input[key].trim())throw new RepositoryError(400,`GitHub backup needs ${key}.`);
  const base=`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`;
  async function request(path,method="GET",body) {
    const response=await fetch(base+path,{method,headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${input.token}`,"Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30_000)});
    if(!response.ok)throw new RepositoryError(response.status===409||response.status===422?409:502,`GitHub backup failed (${response.status}).`);
    return response.json();
  }
  const info=await request("");
  if(!info.private)throw new RepositoryError(400,"Complete SQLite backups require a private repository because they include history and raw events.");
  const branch=(input.branch||info.default_branch).split("/").map(encodeURIComponent).join("/");
  const head=await request(`/git/ref/heads/${branch}`);
  const parent=await request(`/git/commits/${head.object.sha}`);
  const directory=await mkdtemp(join(tmpdir(),"mory-backup-"));
  const file=join(directory,"snapshot.sqlite");
  try {
    const archive=await repository.backup(file);
    const sqlitePath=input.sqlitePath||"mory/mory.sqlite",jsonPath=input.jsonPath||"mory/memories.json";
    if([sqlitePath,jsonPath].some(path=>typeof path!=="string"||path.startsWith("/")||path.split("/").some(part=>!part||part===".."))||sqlitePath===jsonPath)throw new RepositoryError(400,"Invalid backup paths.");
    const sqlite=await readFile(file);
    const sqliteBlob=await request("/git/blobs","POST",{content:sqlite.toString("base64"),encoding:"base64"});
    const jsonBlob=await request("/git/blobs","POST",{content:Buffer.from(JSON.stringify(archive,null,2)).toString("base64"),encoding:"base64"});
    const tree=await request("/git/trees","POST",{base_tree:parent.tree.sha,tree:[{path:sqlitePath,mode:"100644",type:"blob",sha:sqliteBlob.sha},{path:jsonPath,mode:"100644",type:"blob",sha:jsonBlob.sha}]});
    const commit=await request("/git/commits","POST",{message:"backup: snapshot Mory SQLite and JSON history",tree:tree.sha,parents:[head.object.sha]});
    await request(`/git/refs/heads/${branch}`,"PATCH",{sha:commit.sha,force:false});
    return {sqlitePath,jsonPath,count:archive.memories.length,commit:commit.sha};
  }finally{
    for(const suffix of ["","-wal","-shm"])await unlink(file+suffix).catch(error=>{if(error.code!=="ENOENT")throw error;});
    await rmdir(directory);
  }
}
