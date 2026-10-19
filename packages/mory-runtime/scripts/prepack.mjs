import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(packageRoot, "../..");
const bundle = join(packageRoot, "bundle");
const client = join(packageRoot, "client");
execFileSync("pnpm", ["--filter", "@illli-studio/mory-client-internal", "build"], { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" });
await rm(bundle, { recursive: true, force: true });
await rm(client, { recursive: true, force: true });
await mkdir(bundle, { recursive: true });
await cp(join(repoRoot, "packages", "memory-client", "dist"), client, { recursive: true });
for (const name of ["server.mjs", "repository.mjs", "github-backup.mjs"]) {
  const source = await readFile(join(repoRoot, "apps", "api", name), "utf8");
  await writeFile(join(bundle, name), source.replaceAll('"@mory/memory-core/protocol"', '"./protocol.mjs"'));
}
await cp(join(repoRoot, "packages", "memory-core", "protocol.mjs"), join(bundle, "protocol.mjs"));
await cp(join(repoRoot, "apps", "web", "dist"), join(bundle, "web"), { recursive: true });
console.log("Mory runtime bundle prepared.");
