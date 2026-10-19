import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=await import(pathToFileURL(require.resolve('typescript')));
const modules=new Map();
export async function webModule(name,salt='default') {
  const key=`${name}:${salt}`;
  if(!modules.has(key)){
    let source=await readFile(new URL(`../../apps/web/src/${name}.ts`,import.meta.url),'utf8');
    source=source.replaceAll('"@mory/memory-core"',JSON.stringify(new URL('../../packages/memory-core/dist/index.js',import.meta.url).href));
    source=source.replaceAll('"dexie"',JSON.stringify(pathToFileURL(require.resolve('dexie')).href));
    const js=ts.default.transpileModule(source,{compilerOptions:{target:ts.default.ScriptTarget.ES2022,module:ts.default.ModuleKind.ESNext}}).outputText;
    modules.set(key,import(`data:text/javascript;base64,${Buffer.from(js+`\n// ${key}`).toString('base64')}`));
  }
  return modules.get(key);
}
export async function fakeIndexedDb(){
  await import(pathToFileURL(require.resolve('fake-indexeddb/auto')));
  Object.assign(globalThis,{indexedDB:window.indexedDB,IDBKeyRange:window.IDBKeyRange});
}
