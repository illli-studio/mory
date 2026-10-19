# Mory Architecture

## Current implementation

- `apps/web`: React/Vite console with an IndexedDB repository for static hosting.
- `apps/api/server.mjs`: HTTP transport, optional model requests and static web serving.
- `apps/api/repository.mjs`: SQLite migration, transactions, immutable versions,
  tombstones, FTS5 BM25, multilingual entity derivation, archive export/restore.
- `apps/api/github-backup.mjs`: consistent SQLite snapshot and atomic GitHub backup.
- `packages/memory-core/protocol.mjs`: shared validation, legacy conversion,
  deterministic content hashes and conflict-preserving snapshot merging.
- `packages/memory-core/src`: creation helpers, filtering and local-calendar statistics.
- `packages/memory-client`: TypeScript API client.
- `packages/mory-runtime`: CLI, packaged web/API service and MCP stdio adapter.

## Storage and migration

With the runtime available, the web console and agents use the same SQLite
repository. Static deployments use IndexedDB. A failed API write is reported;
it does not silently switch to a different repository.

Schema 2 retains the original SQLite tables and adds a canonical JSON document,
revision counters, complete version records, a search index and repository identity.
Migration captures the surviving original before subsequent edits. History that
was already overwritten by an earlier runtime cannot be recovered.

IndexedDB version 2 adds transaction metadata, deletion intent and version history.
Legacy records receive canonical hashes before mutation. Transfer from IndexedDB
to a particular API repository is recorded once by repositoryId. It merges
existing records and tombstones rather than reimporting whenever SQLite is empty.

## Synchronization

1. Read a complete local snapshot and its generation.
2. Read the remote snapshot together with its file SHA.
3. Merge additions and tombstones. Keep divergent same-id content in a stable
   conflict copy; do not silently discard either version.
4. Upload with the SHA from that same read. A 409 causes a new read and a new merge.
5. Apply the result locally in one transaction. If another local writer changed
   the generation during the network request, fail without overwriting that edit.

Pull only performs steps 1–3 and 5. Push also merges existing remote contents.
A normal load only uploads when the user has enabled automatic synchronization.
Tombstones are retained after successful sync. No sync path calls clear first.

## Backup and recovery

The JSON archive preserves full versions, original inputs, relations and tombstones.
SQLite backups use the online backup API; the readable archive is generated from
the resulting database. Both files enter one GitHub commit, with a non-force branch
update. Complete SQLite backups require a private repository.

## Verification and remaining boundaries

`pnpm test` runs HTTP/MCP, SQLite, IndexedDB, mocked GitHub concurrency and
backup/restore regressions. `pnpm typecheck` checks TypeScript and parses API modules.
`pnpm build` compiles the shared packages and website. The runtime prepack copies
all API modules and the shared protocol so the published CLI has no workspace dependency.

Connectors for OS capture, OPFS attachments, encryption, vector ANN indexing,
WebDAV, and a dedicated conflict-resolution/history UI remain future work.
FTS5 uses Han bigrams for recall; it is not a specialized Chinese language analyzer.
