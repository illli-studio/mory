import type { MemoryObject } from "@mory/memory-core";

const apiUrlKey = "mory.api.url";
const tokenKey = "mory.api.token";

export function getMoryApiConfig() {
  return {
    url: localStorage.getItem(apiUrlKey) || import.meta.env.VITE_MORY_API_URL || "http://127.0.0.1:8787",
    token: localStorage.getItem(tokenKey) || "",
  };
}

export function setMoryApiConfig(config: { url: string; token: string }) {
  localStorage.setItem(apiUrlKey, config.url.trim().replace(/\/$/, ""));
  localStorage.setItem(tokenKey, config.token.trim());
}

export function hasMoryApiConfig() {
  return Boolean(getMoryApiConfig().token);
}

export async function moryRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getMoryApiConfig();
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${config.token}`, ...(init.headers || {}) },
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || `Mory API request failed (${response.status})`);
  return result;
}

export async function loadRemoteMemories() {
  const result = await moryRequest<{ memories: MemoryObject[] }>("/v1/memories");
  return result.memories;
}

export async function saveRemoteMemory(memory: MemoryObject) {
  return moryRequest<{ memory: MemoryObject; duplicate: boolean }>("/v1/memories", { method: "POST", body: JSON.stringify(memory) });
}

export async function updateRemoteMemory(memory: MemoryObject) {
  return moryRequest<{ memory: MemoryObject }>(`/v1/memories/${memory.id}`, { method: "PATCH", body: JSON.stringify(memory) });
}

export async function deleteRemoteMemory(id: string) {
  return moryRequest<{ ok: boolean }>(`/v1/memories/${id}`, { method: "DELETE" });
}

export async function backupRemoteGithub(config: { token: string; owner: string; repo: string; branch: string }) {
  return moryRequest<{ sqlitePath: string; jsonPath: string; count: number }>("/v1/backup/github", {
    method: "POST",
    body: JSON.stringify({ ...config, sqlitePath: "mory/mory.sqlite", jsonPath: "mory/memories.json" }),
  });
}
