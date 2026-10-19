import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openRepository } from '../apps/api/repository.mjs';
import { backupGithub } from '../apps/api/github-backup.mjs';

test('GitHub backup commits SQLite and JSON from one snapshot with a non-force ref update',async t=>{
  const repo=await openRepository(':memory:');t.after(()=>repo.close());
  await repo.create({id:'backup',text:'Back up complete history',isPrivate:true});
  const blobs=[],trees=[],refs=[];const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=async(url,init={})=>{
    const body=init.body?JSON.parse(init.body):undefined;
    if(url.endsWith('/git/blobs')){blobs.push(body);return Response.json({sha:`blob-${blobs.length}`});}
    if(url.endsWith('/git/trees')){trees.push(body);return Response.json({sha:'tree'});}
    if(url.endsWith('/git/commits')&&init.method==='POST')return Response.json({sha:'new-commit'});
    if(url.endsWith('/git/refs/heads/main')){refs.push(body);return Response.json({object:{sha:'new-commit'}});}
    if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:'old-commit'}});
    if(url.endsWith('/git/commits/old-commit'))return Response.json({tree:{sha:'old-tree'}});
    return Response.json({private:true,default_branch:'main'});
  };
  const result=await backupGithub(repo,{token:'fake',owner:'test',repo:'private'});
  assert.equal(result.commit,'new-commit');assert.equal(trees.length,1);assert.equal(trees[0].tree.length,2);
  assert.equal(Buffer.from(blobs[0].content,'base64').subarray(0,15).toString(),'SQLite format 3');
  const archive=JSON.parse(Buffer.from(blobs[1].content,'base64').toString());
  assert.equal(archive.memories[0].isPrivate,true);assert.equal(archive.history.length,1);
  assert.deepEqual(refs,[{sha:'new-commit',force:false}]);
});
test('a moved GitHub branch aborts the backup instead of force overwriting it',async t=>{
  const repo=await openRepository(':memory:');t.after(()=>repo.close());const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let refs=0;
  globalThis.fetch=async(url,init={})=>{
    if(url.endsWith('/git/refs/heads/main')){refs++;return Response.json({message:'conflict'},{status:422});}
    if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:'old'}});
    if(url.endsWith('/git/commits/old'))return Response.json({tree:{sha:'tree'}});
    if(init.method==='POST')return Response.json({sha:'new'});
    return Response.json({private:true,default_branch:'main'});
  };
  await assert.rejects(backupGithub(repo,{token:'fake',owner:'test',repo:'test'}),/422/);assert.equal(refs,1);
});
