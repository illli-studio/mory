import os
import urllib.request
import json


class MoryBackend:
    """Small Hermes-compatible backend adapter for the Mory HTTP API."""

    def __init__(self, base_url=None, token=None):
        self.base_url = (base_url or os.getenv("MORY_API_URL", "http://127.0.0.1:8787")).rstrip("/")
        self.token = token or os.getenv("MORY_API_TOKEN", "")

    def _request(self, method, path, payload=None):
        data = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode())

    def remember(self, text, project_id=None, metadata=None, kind="note"):
        return self._request("POST", "/v1/memories/remember", {
            "text": text,
            "source": "hermes",
            "actor": {"type": "agent", "id": "hermes"},
            "scope": {"projectId": project_id} if project_id else {},
            "metadata": metadata or {},
            "kind": kind,
        })

    def search(self, query, project_id=None, limit=10):
        return self._request("POST", "/v1/memories/search", {
            "query": query,
            "limit": limit,
            "scope": {"projectId": project_id} if project_id else {},
        })

    def context(self, project_id=None, limit=20):
        result = self.search("project architecture decision preference constraint task", project_id, limit)
        return "\n".join(f"- {item['memory']['text']}" for item in result.get("results", []))

    def forget(self, memory_id):
        return self._request("DELETE", f"/v1/memories/{memory_id}")
