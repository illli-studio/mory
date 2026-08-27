# Mory plugin for Hermes

This adapter stores Hermes memories in the Mory web service. Configure:

```bash
set MORY_API_URL=http://127.0.0.1:8787
set MORY_API_TOKEN=mory-dev-token
```

The plugin contract is intentionally small: `remember`, `search`, `context`, and `forget`.
The implementation uses the same HTTP API as the web UI, so all memories are managed in one place.

The adapter deliberately has no local database and no approval queue. Hermes writes directly to the authenticated Mory repository; the website is the management surface.

`remember` uses Mory's extraction endpoint. Set `MORY_LLM_API_KEY` and optionally `MORY_LLM_BASE_URL` / `MORY_LLM_MODEL` on the API process to enable LLM extraction. Without a key, Mory uses a deterministic local fallback so the integration remains usable.
