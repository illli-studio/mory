# Setup and development

Current implementation:

- Node.js 22.18+ with SQLite / FTS5
- React 19, TypeScript, Vite, Zustand and Dexie
- CLI and MCP stdio server
- Optional OpenAI-compatible extraction and embedding APIs
- GitHub / Gitee JSON synchronization

Rust/Tauri native capture, OPFS attachments and other connectors remain roadmap work.

## Agent memory service

Mory can run as a single local service that serves both the web console and the API:

```bash
npm install -g @illli-studio/mory
mory init
mory start
```

To keep the service running while returning to your shell:

```bash
mory start --background
mory status
```

Data can be moved between machines without touching the SQLite file directly:

```bash
mory export ./mory-export.json
mory import ./mory-export.json
```

The default data directory is `~/.mory` (or the platform equivalent). The website and all local agents use the same SQLite repository. The API stores append-oriented memory records, hash-deduplicates exact repeats, keeps event history, supports BM25/entity search, and uses tombstone deletes.

Mory also exposes a generic MCP server over stdio. Add this to an MCP-compatible agent:

```json
{
  "mcpServers": {
    "mory": {
      "command": "mory",
      "args": ["mcp"]
    }
  }
}
```

Available tools are `mory_remember`, `mory_search`, `mory_context`, `mory_get`, `mory_list`, `mory_update`, and `mory_forget`. TypeScript integrations can use `@illli-studio/mory/client`.

The web Sync panel merges JSON snapshots with persistent tombstones. Conflicting
versions are retained as separate copies. The API can additionally back up both
`mory/mory.sqlite` and a full JSON archive in one GitHub commit to a private
repository. GitHub is a versioned backup target; the running SQLite file remains
the source of truth. See [API and recovery details](API.md).

For source development, run `pnpm install`, `pnpm api:dev` and `pnpm dev`.
Run `pnpm test`, `pnpm typecheck` and `pnpm build` before shipping changes.

## Deploy the web app to Cloudflare Pages

The web app can also run as a static GitHub-backed memory viewer/editor. This
mode does not require `mory start`, Node.js, or a Cloudflare database: the
browser keeps a local IndexedDB cache and GitHub stores the durable
`mory/memories.json` snapshot.

Use these Cloudflare Pages settings:

```text
Build command: pnpm build
Build output directory: apps/web/dist
```

After deployment, open the Memory Sync settings, enter a fine-grained GitHub
token with Contents read/write access to the selected repository, and choose
the repository containing the memory file. The token is kept in that browser's
local storage; it is not part of the deployed site. Never commit a token to
the repository or expose it in build-time environment variables.

The local npm package remains the full local-first mode with SQLite, CLI, and
MCP. Cloudflare Pages is the lightweight web-only mode.

---


