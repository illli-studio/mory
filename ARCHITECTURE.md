# Mory Architecture

Mory is not just a React app. It should become a local-first memory repository with clear boundaries between capture, storage, organization, sync, and user experience.

## Product Layers

```text
Apps
  web                 PWA memory console
  desktop-agent       clipboard, files, OS events, background capture
  browser-extension   pages, highlights, tabs, bookmark imports

Packages
  memory-core         immutable MemoryObject, hashes, snapshots, commits
  memory-repository   IndexedDB, OPFS, append-only log, import/export
  memory-indexer      cleanup, tags, previews, search indexes, retrieval
  sync-github         GitHub content/tree sync
  sync-webdav         WebDAV sync
  connectors          connector contracts and shared capture pipeline
  security            encryption, redaction, permission policy
  ui                  product UI primitives and design system
```

## Runtime Shape

```text
Connector Event
  -> Capture Pipeline
  -> Raw MemoryObject
  -> Local Memory Repository
  -> Local Index Derivations
  -> Search / Recall / Selection Packs
  -> Optional GitHub or WebDAV Sync
```

## Core Principles

- Local-first: raw memory enters local storage before any cloud action.
- Append-only: derived metadata never overwrites raw history.
- Content-addressed: duplicate content is detected by stable hashes.
- Connector-neutral: clipboard, browser, files, chat and GitHub share one capture contract.
- Sync-optional: GitHub/WebDAV are user-owned transport layers, not the product database.

## Storage Plan

The browser MVP currently uses Dexie and IndexedDB. The complete repository should split storage responsibilities:

- IndexedDB: MemoryObject metadata, event log, indexes, sync cursors.
- OPFS: large raw files, attachments, imported PDFs, chunk payloads.
- Content hash: deduplication and immutable object identity.
- Tombstones: deletion intent without rewriting historical commits.
- Snapshots: daily or project-level previews generated as derived objects.

## Sync Plan

GitHub sync in the MVP writes one JSON file. That is useful for validation, but not the final protocol.

The mature sync package should use chunked objects:

```text
mory/
  manifest.json
  objects/
    ab/cd/<hash>.json
  attachments/
    <hash>.bin
  snapshots/
    2026-08-12.json
  commits/
    <commit-id>.json
```

This keeps large repositories incremental and close to the Git-like model.

## MVP Boundaries

Already present:

- `apps/web`
- `packages/memory-core`
- IndexedDB persistence
- manual capture
- search and filters
- basic GitHub JSON sync

Next structural milestones:

- Extract `memory-repository` from `apps/web/src/db.ts`.
- Move GitHub sync into `packages/sync-github`.
- Add `packages/connectors` and implement clipboard capture.
- Add `packages/memory-indexer` for previews, tags, search indexes, and recall views.
- Add OPFS-backed attachment storage.
