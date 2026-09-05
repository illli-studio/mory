import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { randomInt } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";

const port = randomInt(21000, 26000);
const token = "smoke-test-token";
let dataDir;
let processHandle;
const base = `http://127.0.0.1:${port}`;

async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(options.headers || {}) } });
  const body = await response.json();
  assert.equal(response.ok, true, `${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(base + "/health")).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API did not start in time");
}

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "mory-smoke-"));
  processHandle = spawn(process.execPath, ["apps/api/server.mjs"], { env: { ...process.env, MORY_PORT: String(port), MORY_API_TOKEN: token, MORY_DATABASE: join(dataDir, "mory.sqlite") }, stdio: "ignore" });
  await waitForServer();
});

after(async () => {
  if (processHandle && processHandle.exitCode === null && processHandle.signalCode === null) {
    await new Promise((resolve) => {
      processHandle.once("exit", resolve);
      processHandle.kill();
    });
  }
  await rm(dataDir, { recursive: true, force: true });
});

test("memory lifecycle and export/import contract", async () => {
  const health = await request("/health", { method: "GET" });
  assert.equal(health.schemaVersion, 1);
  const remembered = await request("/v1/memories/remember", { method: "POST", body: JSON.stringify({ text: "The Mory smoke test remembers durable project context for future agents.", source: "test", scope: { projectId: "smoke" } }) });
  assert.equal(remembered.addedCount, 1);
  const memoryId = remembered.memories[0].id;

  const context = await request("/v1/context", { method: "POST", body: JSON.stringify({ query: "durable project context", scope: { projectId: "smoke" } }) });
  assert.match(context.context, /durable project context/);

  const exported = await request("/v1/export", { method: "GET" });
  assert.equal(exported.memories.length, 1);
  assert.equal(exported.memories[0].id, memoryId);

  const found = await request(`/v1/memories/${memoryId}`, { method: "GET" });
  assert.equal(found.memory.id, memoryId);
  const originalHash = found.memory.hash;
  const updated = await request(`/v1/memories/${memoryId}`, { method: "PATCH", body: JSON.stringify({ text: "The Mory smoke test was edited and persisted through the update API." }) });
  assert.equal(updated.memory.text, "The Mory smoke test was edited and persisted through the update API.");
  assert.notEqual(updated.memory.hash, originalHash);
  const reloaded = await request(`/v1/memories/${memoryId}`, { method: "GET" });
  assert.equal(reloaded.memory.text, updated.memory.text);
  await request(`/v1/memories/${memoryId}`, { method: "DELETE" });
  const listed = await request("/v1/memories", { method: "GET" });
  assert.equal(listed.total, 0);
});

test("MCP stdio exposes the memory tools", async () => {
  const mcp = spawn(process.execPath, ["packages/mory-runtime/src/cli.mjs", "mcp"], { env: { ...process.env, MORY_API_URL: base, MORY_API_TOKEN: token }, stdio: ["pipe", "pipe", "ignore"] });
  const output = new Promise((resolve) => { let text = ""; mcp.stdout.on("data", (chunk) => { text += chunk.toString(); }); mcp.on("close", () => resolve(text)); });
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }) + "\n");
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
  mcp.stdin.end();
  const messages = (await output).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(messages[0].result.serverInfo.name, "mory");
  assert.ok(messages[1].result.tools.some((tool) => tool.name === "mory_context"));
});
