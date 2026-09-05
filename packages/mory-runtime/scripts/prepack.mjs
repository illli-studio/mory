import { cp, mkdir, rm } from "node:fs/promises";
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
await cp(join(repoRoot, "apps", "api", "server.mjs"), join(bundle, "server.mjs"));
await cp(join(repoRoot, "apps", "web", "dist"), join(bundle, "web"), { recursive: true });
console.log("Mory runtime bundle prepared.");
