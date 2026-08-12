import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  Bot,
  Brain,
  Cable,
  Check,
  ChevronDown,
  Clipboard,
  Cloud,
  Database,
  FileText,
  Github,
  Globe,
  Link,
  LockKeyhole,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { MemoryObject, MemorySource } from "@mory/memory-core";
import { selectFilteredMemories, selectStats, useMemoryStore } from "./store";

const sources: Array<{ value: MemorySource | "all"; label: string }> = [
  { value: "all", label: "All sources" },
  { value: "manual", label: "Manual" },
  { value: "clipboard", label: "Clipboard" },
  { value: "browser", label: "Browser" },
  { value: "file", label: "File" },
  { value: "chat", label: "Chat" },
  { value: "github", label: "GitHub" },
];

export function App() {
  const store = useMemoryStore();
  const { load, error, syncMessage, query, setQuery, source, setSource } = store;
  const memories = useMemo(() => selectFilteredMemories(store), [store.memories, store.query, store.source]);
  const stats = useMemo(() => selectStats(store), [store.memories]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="product-shell">
      <header className="product-header">
        <div className="brand-lockup">
          <div className="brand-glyph">
            <Brain size={22} />
          </div>
          <div>
            <strong>Mory</strong>
            <span>Memory layer for AI</span>
          </div>
        </div>
        <div className="header-actions">
          <StatusChip tone="good" label="Local-first" />
          <StatusChip tone="neutral" label={`${stats.total} objects`} />
        </div>
      </header>

      <section className="console">
        <div className="console-main">
          <section className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={16} />
              Personal memory operating system
            </span>
            <h1>Turn everything you notice into reusable AI context.</h1>
            <p>Mory captures raw memory, preserves history locally, and prepares the pieces for search, sync, connectors, and future retrieval.</p>
          </section>

          <CaptureConsole />

          <div className="search-row">
            <label className="search-input">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Recall by project, tag, source, phrase, or hash" />
            </label>
            <SourceSelect value={source as MemorySource | "all"} onChange={setSource} options={sources} />
          </div>

          {error ? <Notice tone="bad" text={error} /> : null}
          {syncMessage ? <Notice tone="good" text={syncMessage} /> : null}
        </div>

        <aside className="console-side">
          <SystemHealth stats={stats} />
          <GithubSyncCard />
          <ConnectorRail />
        </aside>
      </section>

      <section className="feed-section">
        <div className="section-heading">
          <div>
            <h2>Memory Feed</h2>
            <p>{memories.length} visible objects from the local repository</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => useMemoryStore.getState().clear()}>
            <Trash2 size={16} />
            Clear local
          </button>
        </div>
        <MemoryFeed memories={memories} />
      </section>
    </main>
  );
}

function CaptureConsole() {
  const { add } = useMemoryStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState<MemorySource>("manual");
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fallbackContent = content.trim() || title.trim() || tags.trim();
    if (!fallbackContent) {
      return;
    }

    await add({ title, content: fallbackContent, source, tags: tags.split(",") });
    setTitle("");
    setContent("");
    setTags("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  return (
    <form className="capture-console" onSubmit={submit}>
      <div className="capture-top">
        <Bot size={18} />
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give this memory a name, or leave it for Mory to infer" />
      </div>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste a decision, page note, prompt, meeting context, link, or fragment worth remembering." />
      <div className="capture-bottom">
        <SourceSelect value={source} onChange={(value) => setSource(value as MemorySource)} options={sources.filter((item) => item.value !== "all")} />
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags: product, mory, research" />
        <button type="submit">
          {saved ? <Check size={17} /> : <Send size={17} />}
          {saved ? "Saved" : "Capture"}
        </button>
      </div>
    </form>
  );
}

function SourceSelect({
  value,
  onChange,
  options,
}: {
  value: MemorySource | "all";
  onChange: (value: MemorySource | "all") => void;
  options: Array<{ value: MemorySource | "all"; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value) ?? options[0];

  function choose(nextValue: MemorySource | "all") {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={open ? "source-select open" : "source-select"}>
      <button
        type="button"
        className={open ? "source-trigger open" : "source-trigger"}
        onClick={() => setOpen((current) => !current)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="source-menu" role="listbox" tabIndex={-1}>
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === value}
              className={item.value === value ? "selected" : ""}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item.value)}
            >
              <span>{item.label}</span>
              {item.value === value ? <Check size={15} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SystemHealth({ stats }: { stats: ReturnType<typeof selectStats> }) {
  return (
    <section className="side-card health-card">
      <div className="card-title">
        <Activity size={17} />
        <h3>Repository Health</h3>
      </div>
      <div className="health-grid">
        <Metric label="Objects" value={stats.total} />
        <Metric label="Today" value={stats.today} />
        <Metric label="Tags" value={stats.tags.length} />
      </div>
      <div className="mini-signal">
        <Database size={16} />
        <span>IndexedDB active</span>
        <Check size={15} />
      </div>
      <TagStack tags={stats.tags} />
    </section>
  );
}

function GithubSyncCard() {
  const { github, updateGithub, mergeGithub, pushGithub, pullGithub, memories } = useMemoryStore();

  return (
    <section className="side-card sync-card">
      <div className="card-title">
        <Github size={17} />
        <h3>GitHub Sync</h3>
      </div>
      <div className="sync-grid">
        <input value={github.owner} onChange={(event) => updateGithub({ owner: event.target.value })} aria-label="GitHub owner" />
        <input value={github.repo} onChange={(event) => updateGithub({ repo: event.target.value })} aria-label="GitHub repo" />
        <input value={github.branch} onChange={(event) => updateGithub({ branch: event.target.value })} aria-label="GitHub branch" />
        <input value={github.path} onChange={(event) => updateGithub({ path: event.target.value })} aria-label="GitHub sync path" />
      </div>
      <input className="token-input" type="password" value={github.token} onChange={(event) => updateGithub({ token: event.target.value })} placeholder="GitHub token with contents read/write" />
      <div className="sync-actions">
        <button className="primary-action" type="button" onClick={() => void mergeGithub()}>
          <Cloud size={16} />
          Merge sync
        </button>
        <button type="button" onClick={() => void pushGithub()} title={`Push ${memories.length} objects`}>
          <ArrowUpToLine size={16} />
        </button>
        <button type="button" onClick={() => void pullGithub()} title="Pull remote repository">
          <ArrowDownToLine size={16} />
        </button>
      </div>
    </section>
  );
}

function ConnectorRail() {
  const connectors = [
    { icon: <Bot size={17} />, name: "Manual", state: "Active" },
    { icon: <Clipboard size={17} />, name: "Clipboard", state: "Next" },
    { icon: <Globe size={17} />, name: "Browser", state: "Next" },
    { icon: <FileText size={17} />, name: "Files", state: "Planned" },
    { icon: <Github size={17} />, name: "GitHub", state: "Ready" },
  ];

  return (
    <section className="side-card">
      <div className="card-title">
        <Cable size={17} />
        <h3>Connectors</h3>
      </div>
      <div className="connector-list">
        {connectors.map((connector) => (
          <div className="connector-item" key={connector.name}>
            {connector.icon}
            <span>{connector.name}</span>
            <strong>{connector.state}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemoryFeed({ memories }: { memories: MemoryObject[] }) {
  if (!memories.length) {
    return (
      <div className="empty-feed">
        <Archive size={26} />
        <h3>Your memory repository is waiting.</h3>
        <p>Capture the first object above and this area becomes your living context feed.</p>
      </div>
    );
  }

  return (
    <div className="memory-grid">
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
    </div>
  );
}

function MemoryCard({ memory }: { memory: MemoryObject }) {
  const setQuery = useMemoryStore((state) => state.setQuery);

  return (
    <article className="memory-card">
      <div className="memory-card-top">
        <span>{memory.source}</span>
        <strong>{memory.score}</strong>
      </div>
      <h3>{memory.payload.title}</h3>
      <p>{memory.payload.content}</p>
      <div className="memory-tags">
        {memory.tags.slice(0, 8).map((tag) => (
          <button key={tag} type="button" onClick={() => setQuery(tag)}>
            #{tag}
          </button>
        ))}
      </div>
      <footer>
        <span>{new Date(memory.capturedAt).toLocaleDateString()}</span>
        <code>{memory.contentHash.slice(0, 12)}</code>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TagStack({ tags }: { tags: Array<{ tag: string; count: number }> }) {
  const setQuery = useMemoryStore((state) => state.setQuery);

  if (!tags.length) {
    return (
      <div className="tag-stack empty">
        <Link size={15} />
        <span>Tags will emerge as you capture.</span>
      </div>
    );
  }

  return (
    <div className="tag-stack">
      {tags.slice(0, 6).map((tag) => (
        <button key={tag.tag} type="button" onClick={() => setQuery(tag.tag)}>
          #{tag.tag}
          <span>{tag.count}</span>
        </button>
      ))}
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "good" | "neutral" }) {
  return (
    <span className={`status-chip ${tone}`}>
      {tone === "good" ? <LockKeyhole size={14} /> : <Archive size={14} />}
      {label}
    </span>
  );
}

function Notice({ text, tone }: { text: string; tone: "good" | "bad" }) {
  return <div className={`notice ${tone}`}>{text}</div>;
}
