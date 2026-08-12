# Mory

Mory is a local-first memory layer for AI. The first MVP captures personal memory objects in the browser, keeps them in IndexedDB, and gives you fast recall through search, tags, source filters, and a lightweight timeline.

## Current MVP Stack

- Vite, React, TypeScript
- Dexie / IndexedDB for local-first storage
- Zustand for UI state
- `@mory/memory-core` for append-only memory primitives

This is only the browser MVP layer. The complete architecture is documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Start

```bash
pnpm install
pnpm dev
```

## MVP Scope

- Create immutable memory objects from manual input
- Generate stable content hashes for deduplication
- Store memories locally in IndexedDB
- Search by title, content, tags, source, and type
- View daily capture stats and recent memory timeline

Future packages will add connectors, Git/WebDAV sync, embeddings, summaries, and snapshots.
