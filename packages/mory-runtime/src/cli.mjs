#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { runMcp } from "./mcp.mjs";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeVersion = "0.1.14";
const repoRoot = resolve(packageRoot, "../..");
const dataDir = process.env.MORY_HOME || join(homedir(), ".mory");
const configPath = join(dataDir, "config.json");
const pidPath = join(dataDir, "mory.pid");
const defaultConfig = () => ({ port: 8787, token: randomBytes(24).toString("hex"), database: join(dataDir, "mory.sqlite") });

function config() {
  mkdirSync(dataDir, { recursive: true });
  if (!existsSync(configPath)) writeFileSync(configPath, JSON.stringify(defaultConfig(), null, 2) + "\n");
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function apiEntry() { return process.env.MORY_API_ENTRY || (existsSync(join(repoRoot, "apps", "api", "server.mjs")) ? join(repoRoot, "apps", "api", "server.mjs") : join(packageRoot, "bundle", "server.mjs")); }
function webDist() { return process.env.MORY_WEB_DIST || (existsSync(join(repoRoot, "apps", "web", "dist", "index.html")) ? join(repoRoot, "apps", "web", "dist") : join(packageRoot, "bundle", "web")); }

async function waitForHealth(base, token, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(base + "/health", { headers: { authorization: `Bearer ${token}` } }); if (response.ok) return true; } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
  return false;
}

async function start(background = false) {
  const current = config();
  const base = `http://127.0.0.1:${current.port}`;
  if (await waitForHealth(base, current.token, 500)) { console.log(`Mory is already running at ${base}`); return; }
  const env = { ...process.env, MORY_PORT: String(current.port), MORY_API_TOKEN: current.token, MORY_DATABASE: current.database, MORY_WEB_DIST: webDist() };
  const child = spawn(process.execPath, [apiEntry()], { env, stdio: background ? "ignore" : "inherit", detached: background });
  if (!await waitForHealth(base, current.token)) { child.kill(); throw new Error("Mory failed to start. Run `mory doctor` for diagnostics."); }
  writeFileSync(pidPath, String(child.pid));
  child.once("exit", () => { if (existsSync(pidPath) && readFileSync(pidPath, "utf8").trim() === String(child.pid)) unlinkSync(pidPath); });
  if (background) child.unref();
  console.log(`Mory is running at ${base}`);
  console.log(`Data: ${current.database}`);
  console.log("MCP: run `mory mcp` from your agent configuration");
  if (background) console.log("Running in background. Use `mory status` or `mory stop`.");
  if (background) return;
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

async function mcpCheck() {
  const current = config();
  const base = process.env.MORY_API_URL || `http://127.0.0.1:${current.port}`;
  const token = process.env.MORY_API_TOKEN || current.token;
  const response = await fetch(base.replace(/\/$/, "") + "/health", { headers: { authorization: `Bearer ${token}` } });
  console.log(JSON.stringify({ api: base, reachable: response.ok, mcp: "ready", protocol: "2025-06-18" }, null, 2));
  if (!response.ok) process.exitCode = 1;
}

async function stop() {
  const current = config();
  if (!await waitForHealth(`http://127.0.0.1:${current.port}`, current.token, 500)) { if (existsSync(pidPath)) unlinkSync(pidPath); console.log("Mory is not running."); return; }
  if (!existsSync(pidPath)) throw new Error("Mory is running, but its PID file is missing. Stop the process manually after checking the port.");
  const pid = Number(readFileSync(pidPath, "utf8").trim());
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("Invalid Mory PID file.");
  process.kill(pid);
  unlinkSync(pidPath);
  console.log("Mory stopped.");
}

async function doctor() {
  const current = config();
  console.log(JSON.stringify({ node: process.version, dataDir, database: current.database, webDist: webDist(), webBuilt: existsSync(join(webDist(), "index.html")), apiEntry: apiEntry(), apiEntryExists: existsSync(apiEntry()) }, null, 2));
}

async function apiRequest(path, current, init = {}) {
  const response = await fetch(`http://127.0.0.1:${current.port}${path}`, { ...init, headers: { authorization: `Bearer ${current.token}`, "content-type": "application/json", ...(init.headers || {}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Mory API error (${response.status})`);
  return result;
}

async function exportMemories(outputPath) {
  const current = config();
  if (!await waitForHealth(`http://127.0.0.1:${current.port}`, current.token, 500)) throw new Error("Mory is not running. Start it before exporting.");
  const result = await apiRequest("/v1/export", current);
  const target = resolve(outputPath || join(dataDir, "mory-export.json"));
  writeFileSync(target, JSON.stringify(result, null, 2) + "\n");
  console.log(`Exported ${result.memories.length} memories to ${target}`);
}

async function importMemories(inputPath) {
  const current = config();
  if (!await waitForHealth(`http://127.0.0.1:${current.port}`, current.token, 500)) throw new Error("Mory is not running. Start it before importing.");
  const source = resolve(inputPath || join(dataDir, "mory-export.json"));
  const parsed = JSON.parse(readFileSync(source, "utf8"));
  const result = await apiRequest("/v1/import", current, { method: "POST", body: JSON.stringify({ memories: parsed.memories || parsed }) });
  console.log(`Imported ${result.addedCount} memories; skipped ${result.duplicateCount} duplicates.`);
}

const [command = "start", ...args] = process.argv.slice(2);
try {
  if (command === "--version" || command === "-v" || command === "version") console.log(runtimeVersion);
  else if (command === "init") { config(); console.log(`Initialized Mory at ${dataDir}`); }
  else if (command === "start") await start(args.includes("--background") || args.includes("-d"));
  else if (command === "stop") await stop();
  else if (command === "export") await exportMemories(args[0]);
  else if (command === "import") await importMemories(args[0]);
  else if (command === "mcp" && args.includes("--check")) await mcpCheck();
  else if (command === "mcp") await runMcp({ baseUrl: process.env.MORY_API_URL || `http://127.0.0.1:${config().port}`, token: process.env.MORY_API_TOKEN || config().token });
  else if (command === "doctor") await doctor();
  else if (command === "status") { const c = config(); console.log(JSON.stringify({ url: `http://127.0.0.1:${c.port}`, dataDir, running: await waitForHealth(`http://127.0.0.1:${c.port}`, c.token, 500) }, null, 2)); }
  else if (command === "token") console.log(config().token);
  else { console.error(`Unknown command: ${command}`); process.exitCode = 1; }
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
