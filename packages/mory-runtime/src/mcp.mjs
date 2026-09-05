const protocolVersion = "2025-06-18";
const runtimeVersion = "0.1.14";

async function callApi(baseUrl, token, path, method = "POST", body) {
  const response = await fetch(baseUrl.replace(/\/$/, "") + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Mory API error (${response.status})`);
  return result;
}

const tools = [
  { name: "mory_remember", description: "Store durable information in the user's local Mory memory.", inputSchema: { type: "object", properties: { text: { type: "string" }, projectId: { type: "string" }, kind: { type: "string" }, metadata: { type: "object" } }, required: ["text"] } },
  { name: "mory_search", description: "Search the user's local Mory memories.", inputSchema: { type: "object", properties: { query: { type: "string" }, projectId: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
  { name: "mory_context", description: "Retrieve relevant memory as prompt-ready context.", inputSchema: { type: "object", properties: { query: { type: "string" }, projectId: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
  { name: "mory_get", description: "Get one local Mory memory by id.", inputSchema: { type: "object", properties: { memoryId: { type: "string" } }, required: ["memoryId"] } },
  { name: "mory_list", description: "List recent local Mory memories.", inputSchema: { type: "object", properties: { projectId: { type: "string" }, limit: { type: "number" } } } },
  { name: "mory_update", description: "Update the content or metadata of an existing local Mory memory.", inputSchema: { type: "object", properties: { memoryId: { type: "string" }, text: { type: "string" }, title: { type: "string" }, kind: { type: "string" }, tags: { type: "array", items: { type: "string" } }, metadata: { type: "object" } }, required: ["memoryId"] } },
  { name: "mory_forget", description: "Delete a memory by id using Mory's tombstone deletion.", inputSchema: { type: "object", properties: { memoryId: { type: "string" } }, required: ["memoryId"] } }
];

async function handle(message, options) {
  if (message.method === "initialize") return { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "mory", version: runtimeVersion } };
  if (message.method === "notifications/initialized") return null;
  if (message.method === "tools/list") return { tools };
  if (message.method !== "tools/call") return {};
  const { name, arguments: input = {} } = message.params || {};
  let result;
  if (name === "mory_remember") result = await callApi(options.baseUrl, options.token, "/v1/memories/remember", "POST", { text: input.text, source: "mcp", actor: { type: "agent", id: "mcp" }, kind: input.kind, metadata: input.metadata, scope: input.projectId ? { projectId: input.projectId } : {} });
  else if (name === "mory_search") result = await callApi(options.baseUrl, options.token, "/v1/memories/search", "POST", { query: input.query, limit: input.limit || 10, scope: input.projectId ? { projectId: input.projectId } : {} });
  else if (name === "mory_context") result = await callApi(options.baseUrl, options.token, "/v1/context", "POST", { query: input.query, limit: input.limit || 12, scope: input.projectId ? { projectId: input.projectId } : {} });
  else if (name === "mory_get") result = await callApi(options.baseUrl, options.token, `/v1/memories/${encodeURIComponent(input.memoryId)}`, "GET");
  else if (name === "mory_list") result = await callApi(options.baseUrl, options.token, `/v1/memories?limit=${encodeURIComponent(input.limit || 20)}${input.projectId ? `&projectId=${encodeURIComponent(input.projectId)}` : ""}`, "GET");
  else if (name === "mory_update") result = await callApi(options.baseUrl, options.token, `/v1/memories/${encodeURIComponent(input.memoryId)}`, "PATCH", { text: input.text, title: input.title, kind: input.kind, tags: input.tags, metadata: input.metadata });
  else if (name === "mory_forget") result = await callApi(options.baseUrl, options.token, `/v1/memories/${encodeURIComponent(input.memoryId)}`, "DELETE");
  else throw new Error(`Unknown tool: ${name}`);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

export async function runMcp(options) {
  let buffer = "";
  for await (const chunk of process.stdin) {
    buffer += chunk.toString();
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try { const message = JSON.parse(line); const result = await handle(message, options); if (message.id !== undefined && result !== null) process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }) + "\n"); }
      catch (error) { const id = (() => { try { return JSON.parse(line).id; } catch { return null; } })(); process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } }) + "\n"); }
    }
  }
}
