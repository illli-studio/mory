<div align="center">

# Mory

### Your Personal Memory Operating System.

*A local-first memory engine that helps AI truly understand you.*

<p>

<img src="https://img.shields.io/badge/Local--First-✓-2ea44f" />
<img src="https://img.shields.io/badge/Open%20Source-AGPLv3-blue" />
<img src="https://img.shields.io/badge/AI%20Native-Memory-purple" />
<img src="https://img.shields.io/badge/Status-Early%20Development-orange" />

</p>

</div>

---

> We don't need smarter AI.
>
> We need AI that remembers.

---

## Why Mory?

Today's AI is incredibly capable.

Yet every conversation starts from zero.

It doesn't remember what you built yesterday.

It doesn't know how you think.

It doesn't understand years of your work.

The missing piece isn't a better model.

It's **memory**.

Mory is building a **Personal Memory Operating System** — a local-first memory engine that continuously learns from your digital life and provides long-term context for any AI.

Instead of asking AI to remember you,

Mory gives you ownership of your own memory.

---

# Vision

Imagine asking:

> *"Continue the project I started six months ago."*

Instead of searching through notes, chats and repositories...

AI immediately understands:

- what project you're referring to
- why you started it
- what decisions were made
- what problems were left unsolved
- what should happen next

That's the future Mory is building.

---

# Philosophy

Mory is designed around four core principles.

## 🏠 Local First

Your memory belongs to you.

Everything is stored locally before anything touches the cloud.

No mandatory accounts.

No vendor lock-in.

Cloud exists only for synchronization.

---

## 📜 Memory is Immutable

AI should never rewrite history.

Original memories never change.

AI only creates:

- summaries
- embeddings
- relationships
- tags
- knowledge

Your raw memories remain untouched forever.

---

## 🌱 AI Learns You

Mory isn't another note-taking app.

It continuously learns:

- how you write
- how you think
- what you're building
- what you're interested in

The longer you use it,

the smarter your AI becomes.

---

## 🔄 Git-inspired Architecture

Mory treats memory like source code.

Every device owns a complete memory repository.

```
Capture

↓

Memory Objects

↓

Memory Commit

↓

Snapshot

↓

Push / Pull

↓

Sync
```

History should be traceable.

Synchronization should be optional.

Ownership should always remain local.

---

# Connectors

Everything that produces context can become a connector.

- ⌨ Keyboard
- 📋 Clipboard
- 🌐 Browser
- 💻 VS Code
- 🐙 GitHub
- 📝 Obsidian
- 📅 Calendar
- 📧 Email
- 📂 Files
- 💬 Chat Applications

More connectors will continue to arrive.

---

# Memory Pipeline

```
Capture

↓

Filter

↓

Understand

↓

Embedding

↓

Knowledge Graph

↓

Memory Repository

↓

AI Context
```

Instead of saving everything forever,

Mory continuously organizes your memory into knowledge.

---

# Long-Term Memory

Mory doesn't simply record events.

It builds understanding.

From thousands of tiny interactions,

AI gradually constructs:

- your projects
- your interests
- your writing style
- your decision history
- your knowledge graph

Your second brain grows naturally over time.

---

# Roadmap

### Phase 1

- Local Memory Repository
- Clipboard Connector
- Browser Connector
- Timeline
- Semantic Search

### Phase 2

- Memory Engine
- AI Daily Summary
- Knowledge Graph
- Embedding Pipeline

### Phase 3

- Multi-device Sync
- Git-like Memory Repository
- Memory Commit
- Snapshot

### Phase 4

- Android Keyboard
- iOS Keyboard
- VS Code Extension
- Open Connector SDK

---

# Tech Stack

> Still evolving.

- Rust
- Tauri
- SQLite
- PostgreSQL
- pgvector
- FastAPI
- OpenAI Compatible APIs

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

The GitHub Sync panel can commit both `mory/mory.sqlite` and a readable `mory/memories.json` snapshot. GitHub is a versioned backup target; the running SQLite file remains the source of truth.

---

# Our Belief

AI models will become commodities.

Memory will not.

The future belongs to AI that truly understands its user.

Mory exists to build that memory.

## License

Mory is available under the GNU Affero General Public License v3.0 or later
for community use. Organizations that need to use Mory in a proprietary,
closed-source, or differently licensed product should obtain a separate
commercial license. See [LICENSE](./LICENSE) and
[LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md).

---

<div align="center">

### Build your own memory.

### Own your own context.

### Let AI finally remember.

⭐ Star this repository if you believe memory is the missing layer of AI.

</div>
