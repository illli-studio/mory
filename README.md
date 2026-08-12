# Mory

Your personal memory operating system.

Mory is a local-first memory layer for AI. It captures personal memory objects, keeps raw history immutable, and prepares your context for search, sync, connectors, and future AI retrieval.

## Why Mory

Every AI conversation starts from zero.

Mory explores a different path: your memory belongs to you, lives locally first, and can be reused by any AI system when you need context.

## Current MVP

The browser MVP can:

- Capture immutable memory objects from manual input
- Generate stable content hashes for deduplication
- Store memories locally in IndexedDB
- Search by title, content, tags, source, and type
- Track basic repository health and tag stats
- Sync a JSON memory repository through GitHub

## Current MVP Stack

- Vite, React, TypeScript
- Dexie / IndexedDB for local-first storage
- Zustand for UI state
- `@mory/memory-core` for memory primitives

This is only the browser MVP layer. The complete architecture is documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Start

```bash
pnpm install
pnpm dev
```

## Architecture Direction

Mory is designed around four principles:

- Local-first: raw memory enters local storage before cloud sync.
- Immutable history: AI can add summaries, tags, embeddings, and relations, but should not rewrite raw memory.
- Connector-first capture: clipboard, browser, files, GitHub, chat logs, notes, and future inputs share one memory pipeline.
- Git-inspired sync: each device can own a complete memory repository and sync through user-owned transports.

## Roadmap

Phase 1:

- Local Memory Repository
- Manual Capture
- Clipboard Connector
- Browser Connector
- GitHub Sync
- Timeline and Search

Phase 2:

- Memory Engine
- Daily Summaries
- Embedding Pipeline
- Semantic Search
- Knowledge Links

Phase 3:

- Chunked Git-like Memory Repository
- WebDAV Sync
- Memory Commit
- Snapshot
- OPFS Attachments

Phase 4:

- Desktop Agent
- VS Code Extension
- Open Connector SDK
- Mobile Input Experiments

## Belief

AI models will become commodities.

Memory will not.

Mory exists to build the memory layer that lets AI finally understand its user.
