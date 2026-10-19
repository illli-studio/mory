# Mory API

The runtime serves the web console and API at `http://127.0.0.1:8787` by default.
All `/v1/*` routes require `Authorization: Bearer <token>`.
`mory init` generates a token in the local configuration directory.
Node.js 22.18 or newer is required.

## Memory contract (schema 2)

The browser and API share `packages/memory-core/protocol.mjs`. New records use
`payload: {title, content, url?}`, `capturedAt`, `updatedAt`, `contentHash`,
`source`, `type`, `kind`, `tags`, `fields`, `metadata`, `isPrivate`, `origin`,
`actor`, `scope`, `status`, and `revision`. The server computes the hash;
client-provided hashes are never trusted. Object key order does not change it.
Legacy API aliases `text`, `title`, `hash`, and `createdAt` remain in responses.
Legacy input shapes are accepted and validated through the same contract.

URL, privacy, device origin and original capture time survive round trips.
A privacy flag controls presentation; it does not encrypt memory contents.

## Endpoints

- `POST /v1/memories`: create a memory; exact repeats return `duplicate: true`.
  An id with different content returns 409. A deleted id cannot be recreated;
  deliberate recovery requires a new id or a full archive restored into an empty repository.
- `POST /v1/memories/remember`: extract durable memories from `text` or `messages`.
  Accepts `source`, `actor`, `scope`, `metadata`, `kind` and `isPrivate`.
  All extracted records and their raw input commit in one transaction.
  LLM output cannot silently supersede other records.
- `GET /v1/memories`: recent active memories. Filters: `projectId`, `userId`;
  pagination: `limit` (1–200, default 50), `offset` (default 0).
  Response includes `total`, `offset` and `nextOffset` (null at the end).
- `GET /v1/memories/:id`: one memory, including its revision and status.
- `PATCH /v1/memories/:id`: update a memory. Browser clients send
  `expectedRevision` from the last read. A stale version returns 409 without
  changing data. Existing agent clients may omit the revision for compatibility;
  they should adopt it to detect edits made before the request started.
  Send `payload.url: null` to clear a URL. Empty content is allowed with a title.
- `DELETE /v1/memories/:id`: tombstone deletion; accepts `expectedRevision`.
- `GET /v1/memories/:id/history`: complete immutable `versions` from migration onward.
  Each entry contains `memory`, `action` and `createdAt`. Older overwritten
  content that was never recorded cannot be reconstructed.
- `POST /v1/clear`: atomically tombstone all active memories.
- `POST /v1/memories/search`: `{query, scope?, limit?}`. Uses FTS5 BM25,
  with extra Han bigrams for Chinese recall. Optional embeddings augment results;
  a model timeout leaves keyword retrieval available. This is local retrieval,
  not a specialized Chinese tokenizer or a large-scale vector database.
- `POST /v1/context`: same search inputs; returns memories and prompt-ready text.
- `GET /v1/snapshot`: complete active repository, tombstones, repositoryId and generation.
  The web console uses this endpoint instead of a single page of the listing.
- `POST /v1/sync`: `{memories, tombstones, expectedGeneration?}`. Validates first,
  then atomically merges and writes. It never clears the repository first.
  A changed generation returns 409. Tombstones win; divergent versions of the
  same id produce a deterministic `~conflict~` copy so both texts survive.
- `GET /v1/export`: full JSON archive containing active records, tombstones,
  all `records`, version history, raw inputs, events and relations.
- `POST /v1/import`: full archive restore, or `{memories}` for a simple import.
  The batch is all-or-nothing. Existing deleted ids are skipped during simple
  import. Conflicting ids return 409; no existing original is overwritten.
- `POST /v1/backup/github`: `{token, owner, repo, branch?, sqlitePath?, jsonPath?}`.
  Creates a SQLite online-backup snapshot, derives JSON from that same copy,
  then uploads both in one Git tree/commit. The branch update is non-force;
  concurrent changes abort rather than overwrite. A private repository is
  required because SQLite includes deleted content and raw history.

Requests are limited to 16 MiB; simple imports accept at most 10,000 records.
Oversized or invalid input fails before replacing existing data.
A full SQLite backup remains the preferred transport for repositories exceeding
JSON request limits.
