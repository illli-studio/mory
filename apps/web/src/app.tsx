import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDownToLine,
  ArrowUpToLine,
  Cable,
  Check,
  ChevronDown,
  Clipboard,
  Cloud,
  Database,
  Download,
  FileText,
  Github,
  Globe,
  Link,
  LockKeyhole,
  MessageCircle,
  Pencil,
  ReceiptText,
  Hourglass,
  CheckSquare,
  Landmark,
  FileCheck2,
  BookOpenCheck,
  NotebookPen,
  Shield,
  SlidersHorizontal,
  Search,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { createPreview, domainTag, extractUrls, type MemoryKind, type MemoryObject, type MemorySource } from "@mory/memory-core";
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

const recordModes: Array<{ kind: MemoryKind; label: string; hint: string }> = [
  { kind: "note", label: "Note", hint: "Freeform memory" },
  { kind: "chat", label: "Chat", hint: "Conversation-style record" },
  { kind: "bill", label: "Bill", hint: "Expense or subscription" },
  { kind: "finance", label: "Finance", hint: "Account, asset, transaction, or financial note" },
  { kind: "task", label: "Task", hint: "Action item with status and due date" },
  { kind: "waiting", label: "Waiting", hint: "Follow-up or pending dependency" },
  { kind: "bookmark", label: "Bookmark", hint: "Link and web reference" },
  { kind: "file", label: "File", hint: "Document, attachment, or local file reference" },
  { kind: "decision", label: "Decision", hint: "Decision record with owner and outcome" },
  { kind: "log", label: "Log", hint: "Daily, project, habit, or event log" },
];

export function App() {
  const store = useMemoryStore();
  const { load, error, syncMessage, query, setQuery, source, setSource, isLoading } = store;
  const memories = useMemo(() => selectFilteredMemories(store), [store.memories, store.query, store.source]);
  const stats = useMemo(() => selectStats(store), [store.memories]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const selectedMemories = useMemo(() => store.memories.filter((memory) => selectedIds.includes(memory.id)), [store.memories, selectedIds]);
  const activeMemory = useMemo(() => store.memories.find((memory) => memory.id === activeMemoryId), [store.memories, activeMemoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="product-shell">
      <header className="product-header">
        <div className="brand-lockup">
          <div className="brand-glyph">
            <Archive size={22} />
          </div>
          <div>
            <strong>Mory</strong>
            <span>Local memory repository</span>
          </div>
        </div>
        <div className="header-actions">
          <StatusChip tone="good" label="Local-first" />
          <StatusChip tone="neutral" label={`${stats.total} objects`} />
        </div>
      </header>

      <section className="workspace-layout">
        <aside className="workspace-nav" aria-label="Record type navigation">
          <div className="nav-brand-card">
            <div className="brand-glyph">
              <Archive size={21} />
            </div>
            <div>
              <strong>Mory</strong>
              <span>Storehouse</span>
            </div>
          </div>
          <div className="nav-section-label">Record types</div>
          <div className="record-nav-list">
            {recordModes.map((mode) => {
              const count = store.memories.filter((memory) => (memory.kind ?? "note") === mode.kind).length;
              return (
                <button key={mode.kind} type="button" onClick={() => setQuery(mode.kind === "note" ? "" : mode.kind)}>
                  {recordIcon(mode.kind)}
                  <span>{mode.label}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
          <div className="nav-section-label">Shortcuts</div>
          <div className="shortcut-list">
            <button type="button" onClick={() => setQuery("private")}>Private</button>
            <button type="button" onClick={() => setQuery("waiting")}>Waiting</button>
            <button type="button" onClick={() => setQuery("bookmark")}>Bookmarks</button>
          </div>
        </aside>
        <div className="workspace-main">
          <section className="console-main">
            <section className="workbench-intro">
              <div>
                <span className="eyebrow">
                  <Archive size={15} />
                  Today
                </span>
                <h1>Store what matters.</h1>
              </div>
              <div className="today-strip" aria-label="Repository summary">
                <Metric label="Saved" value={stats.total} />
                <Metric label="Today" value={stats.today} />
                <Metric label="Topics" value={stats.tags.length} />
              </div>
            </section>

            <CaptureConsole />

            <div className="command-bar">
              <label className="search-input">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memories, tags, links, bills, tasks..." />
              </label>
              <SourceSelect value={source as MemorySource | "all"} onChange={setSource} options={sources} />
            </div>

            <AdvancedFilters />

            {error ? <Notice tone="bad" text={error} onRetry={() => void load()} /> : null}
            {syncMessage ? <Notice tone="good" text={syncMessage} /> : null}
            <ContextPack memories={selectedMemories} onClear={() => setSelectedIds([])} />
          </section>

          <section className="feed-section">
            <div className="section-heading">
              <div>
                <h2>Memory Feed</h2>
                <p>{memories.length} visible objects from the local repository</p>
              </div>
              <div className="feed-actions">
                <BookmarkImport />
                <TextImport />
                <JsonImport />
                <JsonExport memories={store.memories} />
                <button className="ghost-button" type="button" onClick={() => useMemoryStore.getState().clear()} title="Remove every local memory object from this browser">
                  <Trash2 size={16} />
                  Clear local
                </button>
              </div>
            </div>
            <MemoryFeed memories={memories} loading={isLoading} />
          </section>
        </div>

        <aside className="console-side">
          <SystemHealth stats={stats} />
          <CollectionsPanel memories={store.memories} />
          <GithubSyncCard />
          <ConnectorRail />
        </aside>
      </section>
      {activeMemory ? (
        <MemoryDetailDrawer
          memory={activeMemory}
          selected={selectedIds.includes(activeMemory.id)}
          onSelect={(checked) => setSelectedIds((current) => (checked ? [...new Set([...current, activeMemory.id])] : current.filter((id) => id !== activeMemory.id)))}
          onClose={() => setActiveMemoryId(null)}
        />
      ) : null}
    </main>
  );

  function MemoryFeed({ memories, loading }: { memories: MemoryObject[]; loading: boolean }) {
    if (loading) {
      return (
        <div className="empty-feed" role="status">
          <Hourglass size={26} />
          <h3>Loading your local repository...</h3>
          <p>Reading memories from IndexedDB.</p>
        </div>
      );
    }

    if (!memories.length) {
      return (
        <div className="empty-feed">
          <Archive size={26} />
          <h3>Your memory repository is waiting.</h3>
          <p>Capture the first object above and this area becomes your living memory feed.</p>
        </div>
      );
    }

    return (
      <div className="memory-grid">
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            selected={selectedIds.includes(memory.id)}
            onSelect={(checked) => setSelectedIds((current) => (checked ? [...new Set([...current, memory.id])] : current.filter((id) => id !== memory.id)))}
            onOpen={() => setActiveMemoryId(memory.id)}
          />
        ))}
      </div>
    );
  }
}

function CaptureConsole() {
  const { add } = useMemoryStore();
  const [kind, setKind] = useState<MemoryKind>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [source, setSource] = useState<MemorySource>("manual");
  const [url, setUrl] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billMerchant, setBillMerchant] = useState("");
  const [billCategory, setBillCategory] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [chatWith, setChatWith] = useState("");
  const [financeAccount, setFinanceAccount] = useState("");
  const [financeType, setFinanceType] = useState("");
  const [financeAmount, setFinanceAmount] = useState("");
  const [financeCurrency, setFinanceCurrency] = useState("USD");
  const [taskStatus, setTaskStatus] = useState("todo");
  const [taskDue, setTaskDue] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [waitingFor, setWaitingFor] = useState("");
  const [waitingDue, setWaitingDue] = useState("");
  const [waitingStatus, setWaitingStatus] = useState("waiting");
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [decisionOwner, setDecisionOwner] = useState("");
  const [decisionStatus, setDecisionStatus] = useState("decided");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logMood, setLogMood] = useState("");
  const [saved, setSaved] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setCaptureError("");
    const sceneContent = buildSceneContent();
    const fallbackContent = sceneContent || title.trim() || tags.trim();
    if (!fallbackContent) {
      setCaptureError("Add a title, note, or required field before capturing.");
      return;
    }

    const detectedUrl = url || extractUrls(`${title} ${fallbackContent}`)[0] || "";
    const nextSource = kind === "chat" ? "chat" : source === "manual" && detectedUrl ? "browser" : source;
    const urlTag = detectedUrl ? domainTag(detectedUrl) : undefined;
    setSubmitting(true);
    try {
      const added = await add({
        title: inferSceneTitle(detectedUrl),
        content: fallbackContent,
        source: nextSource,
        kind,
        url: detectedUrl,
        fields: buildSceneFields(),
        tags: [...tags.split(","), urlTag ?? "", kind === "bill" ? billCategory : ""],
      });
      if (!added) {
        setCaptureError(useMemoryStore.getState().error ?? "Could not save this memory.");
        return;
      }
      setTitle("");
      setContent("");
      setTags("");
      setUrl("");
      setBillAmount("");
      setBillMerchant("");
      setBillCategory("");
      setBillDate(new Date().toISOString().slice(0, 10));
      setChatWith("");
      setFinanceAccount("");
      setFinanceType("");
      setFinanceAmount("");
      setFinanceCurrency("USD");
      setTaskStatus("todo");
      setTaskDue("");
      setTaskOwner("");
      setWaitingFor("");
      setWaitingDue("");
      setWaitingStatus("waiting");
      setFileName("");
      setFilePath("");
      setDecisionOwner("");
      setDecisionStatus("decided");
      setLogDate(new Date().toISOString().slice(0, 10));
      setLogMood("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } finally {
      setSubmitting(false);
    }
  }

  function buildSceneContent(): string {
    if (kind === "bill") {
      return [
        billMerchant ? `Merchant: ${billMerchant}` : "",
        billAmount ? `Amount: ${billAmount}` : "",
        billCategory ? `Category: ${billCategory}` : "",
        billDate ? `Date: ${billDate}` : "",
        content.trim() ? `Note: ${content.trim()}` : "",
      ].filter(Boolean).join("\n");
    }

    if (kind === "bookmark") {
      return [title.trim(), url.trim(), content.trim()].filter(Boolean).join("\n");
    }

    if (kind === "finance") {
      return [
        financeType ? `Type: ${financeType}` : "",
        financeAccount ? `Account: ${financeAccount}` : "",
        financeAmount ? `Amount: ${financeAmount} ${financeCurrency}` : "",
        content.trim() ? `Note: ${content.trim()}` : "",
      ].filter(Boolean).join("\n");
    }

    if (kind === "task") {
      return [
        taskStatus ? `Status: ${taskStatus}` : "",
        taskDue ? `Due: ${taskDue}` : "",
        taskOwner ? `Owner: ${taskOwner}` : "",
        content.trim(),
      ].filter(Boolean).join("\n");
    }

    if (kind === "waiting") {
      return [
        waitingFor ? `Waiting for: ${waitingFor}` : "",
        waitingDue ? `Follow up: ${waitingDue}` : "",
        waitingStatus ? `Status: ${waitingStatus}` : "",
        content.trim(),
      ].filter(Boolean).join("\n");
    }

    if (kind === "file") {
      return [
        fileName ? `File: ${fileName}` : "",
        filePath ? `Path: ${filePath}` : "",
        content.trim(),
      ].filter(Boolean).join("\n");
    }

    if (kind === "decision") {
      return [
        decisionOwner ? `Owner: ${decisionOwner}` : "",
        decisionStatus ? `Status: ${decisionStatus}` : "",
        content.trim(),
      ].filter(Boolean).join("\n");
    }

    if (kind === "log") {
      return [
        logDate ? `Date: ${logDate}` : "",
        logMood ? `Mood/State: ${logMood}` : "",
        content.trim(),
      ].filter(Boolean).join("\n");
    }

    if (kind === "chat") {
      return [chatWith ? `With: ${chatWith}` : "", content.trim()].filter(Boolean).join("\n");
    }

    return content.trim();
  }

  function buildSceneFields() {
    if (kind === "bill") {
      return { amount: billAmount, merchant: billMerchant, category: billCategory, date: billDate };
    }

    if (kind === "chat") {
      return { with: chatWith };
    }

    if (kind === "bookmark") {
      return { domain: url ? domainTag(url) : undefined };
    }

    if (kind === "finance") {
      return { account: financeAccount, type: financeType, amount: financeAmount, currency: financeCurrency };
    }

    if (kind === "task") {
      return { status: taskStatus, due: taskDue, owner: taskOwner };
    }

    if (kind === "waiting") {
      return { waitingFor, followUp: waitingDue, status: waitingStatus };
    }

    if (kind === "file") {
      return { fileName, filePath };
    }

    if (kind === "decision") {
      return { owner: decisionOwner, status: decisionStatus };
    }

    if (kind === "log") {
      return { date: logDate, mood: logMood };
    }

    return {};
  }

  function inferSceneTitle(detectedUrl: string): string {
    if (title.trim()) {
      return title.trim();
    }

    if (kind === "bill") {
      return [billMerchant || "Bill", billAmount].filter(Boolean).join(" - ");
    }

    if (kind === "bookmark" && detectedUrl) {
      return inferClipboardTitle(detectedUrl, detectedUrl);
    }

    if (kind === "chat" && chatWith) {
      return `Chat with ${chatWith}`;
    }

    if (kind === "finance") {
      return [financeType || "Finance", financeAmount ? `${financeAmount} ${financeCurrency}` : ""].filter(Boolean).join(" - ");
    }

    if (kind === "task") {
      return taskOwner ? `Task for ${taskOwner}` : "Task";
    }

    if (kind === "waiting") {
      return waitingFor ? `Waiting for ${waitingFor}` : "Waiting item";
    }

    if (kind === "file") {
      return fileName || "File record";
    }

    if (kind === "decision") {
      return "Decision record";
    }

    if (kind === "log") {
      return logDate ? `Log ${logDate}` : "Log entry";
    }

    return "";
  }

  async function pasteFromClipboard() {
    setClipboardMessage("");

    if (!navigator.clipboard?.readText) {
      setClipboardMessage("Clipboard read is not available in this browser.");
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setClipboardMessage("Clipboard is empty.");
        return;
      }

      setSource("clipboard");
      const detectedUrl = extractUrls(text)[0];
      if (detectedUrl) {
        setSource("browser");
        setUrl(detectedUrl);
        setTags((current) => mergeTagText(current, ["browser", domainTag(detectedUrl) ?? ""]));
      }
      setContent((current) => (current.trim() ? `${current.trim()}\n\n${text.trim()}` : text.trim()));
      setTitle((current) => current || inferClipboardTitle(text, detectedUrl));
      setClipboardMessage("Clipboard loaded.");
    } catch {
      setClipboardMessage("Allow clipboard permission, then try again.");
    }
  }

  return (
    <form className="capture-console" onSubmit={submit}>
      <div className="record-mode-shell">
        <div className="record-mode-current">
          <div className="record-mode-orb">{recordIcon(kind)}</div>
          <div>
            <strong>{recordLabel(kind)} record</strong>
            <span>{recordHint(kind)}</span>
          </div>
        </div>
        <div className="record-mode-tabs" role="tablist" aria-label="Record type">
          {recordModes.map((mode) => (
            <button key={mode.kind} type="button" className={kind === mode.kind ? "active" : ""} onClick={() => setKind(mode.kind)} title={mode.hint}>
              {recordIcon(mode.kind)}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="capture-top">
        {recordIcon(kind)}
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={titlePlaceholder(kind)} />
      </div>
      <div className="scene-panel">{renderSceneFields()}</div>
      <textarea className={kind === "chat" ? "chat-textarea" : ""} value={content} onChange={(event) => setContent(event.target.value)} placeholder={contentPlaceholder(kind)} />
      <div className="capture-bottom">
        <SourceSelect value={kind === "chat" ? "chat" : source} onChange={(value) => setSource(value as MemorySource)} options={sources.filter((item) => item.value !== "all")} />
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags: product, mory, research" />
        <button className="clipboard-action" type="button" onClick={() => void pasteFromClipboard()}>
          <Clipboard size={17} />
          Paste
        </button>
        <button type="submit" disabled={submitting}>
          {saved ? <Check size={17} /> : <Send size={17} />}
          {submitting ? "Saving..." : saved ? "Saved" : "Capture"}
        </button>
      </div>
      {clipboardMessage ? <p className="capture-hint">{clipboardMessage}</p> : null}
      {captureError ? <p className="capture-error" role="alert">{captureError}</p> : null}
    </form>
  );

  function renderSceneFields() {
    if (kind === "note") {
      return <p className="scene-empty">No required fields. Just capture the memory and add tags if useful.</p>;
    }

    if (kind === "bill") {
      return (
        <div className="scene-fields bill-fields">
          <input value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="Amount, e.g. 68.90" inputMode="decimal" />
          <input value={billMerchant} onChange={(event) => setBillMerchant(event.target.value)} placeholder="Merchant or payee" />
          <input value={billCategory} onChange={(event) => setBillCategory(event.target.value)} placeholder="Category, e.g. food, infra, travel" />
          <input value={billDate} onChange={(event) => setBillDate(event.target.value)} type="date" />
        </div>
      );
    }

    if (kind === "chat") {
      return <div className="scene-fields"><input value={chatWith} onChange={(event) => setChatWith(event.target.value)} placeholder="Conversation with / channel / room" /></div>;
    }

    if (kind === "finance") {
      return (
        <div className="scene-fields finance-fields">
          <input value={financeAmount} onChange={(event) => setFinanceAmount(event.target.value)} placeholder="Amount / value" inputMode="decimal" />
          <input value={financeCurrency} onChange={(event) => setFinanceCurrency(event.target.value.toUpperCase())} placeholder="Currency" />
          <input value={financeAccount} onChange={(event) => setFinanceAccount(event.target.value)} placeholder="Account / asset / wallet" />
          <input value={financeType} onChange={(event) => setFinanceType(event.target.value)} placeholder="Type: income, asset, debt, transfer" />
        </div>
      );
    }

    if (kind === "task") {
      return (
        <div className="scene-fields task-fields">
          <InlineSelect
            value={taskStatus}
            onChange={setTaskStatus}
            options={[
              { value: "todo", label: "Todo" },
              { value: "doing", label: "Doing" },
              { value: "done", label: "Done" },
              { value: "blocked", label: "Blocked" },
            ]}
          />
          <input value={taskDue} onChange={(event) => setTaskDue(event.target.value)} type="date" />
          <input value={taskOwner} onChange={(event) => setTaskOwner(event.target.value)} placeholder="Owner / project" />
        </div>
      );
    }

    if (kind === "waiting") {
      return (
        <div className="scene-fields task-fields">
          <input value={waitingFor} onChange={(event) => setWaitingFor(event.target.value)} placeholder="Waiting for person / event / reply" />
          <input value={waitingDue} onChange={(event) => setWaitingDue(event.target.value)} type="date" />
          <InlineSelect
            value={waitingStatus}
            onChange={setWaitingStatus}
            options={[
              { value: "waiting", label: "Waiting" },
              { value: "follow-up", label: "Follow-up" },
              { value: "received", label: "Received" },
            ]}
          />
        </div>
      );
    }

    if (kind === "bookmark") {
      return <div className="scene-fields"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/page" /></div>;
    }

    if (kind === "file") {
      return (
        <div className="scene-fields task-fields">
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="File name" />
          <input value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="Path, drive URL, or storage location" />
        </div>
      );
    }

    if (kind === "decision") {
      return (
        <div className="scene-fields task-fields">
          <input value={decisionOwner} onChange={(event) => setDecisionOwner(event.target.value)} placeholder="Owner / team / project" />
          <InlineSelect
            value={decisionStatus}
            onChange={setDecisionStatus}
            options={[
              { value: "proposed", label: "Proposed" },
              { value: "decided", label: "Decided" },
              { value: "reversed", label: "Reversed" },
            ]}
          />
        </div>
      );
    }

    return (
      <div className="scene-fields task-fields">
        <input value={logDate} onChange={(event) => setLogDate(event.target.value)} type="date" />
        <input value={logMood} onChange={(event) => setLogMood(event.target.value)} placeholder="Mood, state, metric, or location" />
      </div>
    );
  }
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

function InlineSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value) ?? options[0];

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={open ? "inline-select open" : "inline-select"}>
      <button
        type="button"
        className={open ? "inline-trigger open" : "inline-trigger"}
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
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="inline-menu" role="listbox" tabIndex={-1}>
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
              {item.value === value ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdvancedFilters() {
  const { query, setQuery, source, setSource, timeRange, setTimeRange, privacy, setPrivacy, tagFilter, setTagFilter, sortBy, setSortBy } = useMemoryStore();

  function clearFilters() {
    setQuery("");
    setSource("all");
    setTimeRange("all");
    setPrivacy("all");
    setTagFilter("");
    setSortBy("newest");
  }

  return (
    <section className="advanced-filters">
      <span>
        <SlidersHorizontal size={15} />
        Filters
      </span>
      <select value={timeRange} onChange={(event) => setTimeRange(event.target.value as typeof timeRange)} title="Filter memories by capture time">
        <option value="all">Any time</option>
        <option value="today">Today</option>
        <option value="week">Last 7 days</option>
        <option value="month">Last 30 days</option>
      </select>
      <select value={privacy} onChange={(event) => setPrivacy(event.target.value as typeof privacy)} title="Filter private or public memories">
        <option value="all">All visibility</option>
        <option value="public">Public only</option>
        <option value="private">Private only</option>
      </select>
      <input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="filter tag" title="Filter by tag" />
      <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} title="Sort memory feed">
        <option value="newest">Newest first</option>
        <option value="score">Score first</option>
      </select>
      <button type="button" onClick={clearFilters} disabled={!query && source === "all" && timeRange === "all" && privacy === "all" && !tagFilter && sortBy === "newest"}>
        Clear filters
      </button>
    </section>
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

function CollectionsPanel({ memories }: { memories: MemoryObject[] }) {
  const setQuery = useMemoryStore((state) => state.setQuery);
  const collections = buildCollections(memories);

  return (
    <section className="side-card">
      <div className="card-title">
        <Archive size={17} />
        <h3>Projects & Topics</h3>
      </div>
      <div className="collection-list">
        {collections.length ? (
          collections.map((collection) => (
            <button key={collection.tag} type="button" onClick={() => setQuery(collection.tag)}>
              <span>#{collection.tag}</span>
              <strong>{collection.count}</strong>
            </button>
          ))
        ) : (
          <p className="empty-note">Capture or import more memories and Mory will cluster them by tag.</p>
        )}
      </div>
    </section>
  );
}

function GithubSyncCard() {
  const { github, updateGithub, mergeGithub, pushGithub, pullGithub, memories } = useMemoryStore();
  const privateCount = memories.filter((memory) => memory.isPrivate).length;

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
      <div className={privateCount ? "sync-warning" : "sync-note"}>
        {privateCount ? `${privateCount} private memories are included in sync/export unless you remove them first.` : "Token is kept in page state and is not restored after refresh."}
      </div>
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
    { icon: <Archive size={17} />, name: "Manual", state: "Active" },
    { icon: <Clipboard size={17} />, name: "Clipboard", state: "Active" },
    { icon: <Globe size={17} />, name: "Browser", state: "Active-lite" },
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

function inferClipboardTitle(text: string, url?: string): string {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "Browser memory";
    }
  }

  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Clipboard memory";
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 72)}...` : firstLine;
}

function mergeTagText(current: string, tags: string[]): string {
  return Array.from(new Set([...current.split(","), ...tags].map((tag) => tag.trim()).filter(Boolean))).join(", ");
}

function MemoryCard({ memory, selected, onSelect, onOpen }: { memory: MemoryObject; selected: boolean; onSelect: (checked: boolean) => void; onOpen: () => void }) {
  const { setQuery, update, remove } = useMemoryStore();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(memory.payload.title);
  const [draftContent, setDraftContent] = useState(memory.payload.content);
  const [draftTags, setDraftTags] = useState(memory.tags.join(", "));

  async function saveEdit() {
    await update({
      ...memory,
      payload: { ...memory.payload, title: draftTitle.trim() || "Untitled memory", content: draftContent.trim() },
      tags: draftTags.split(",").map((tag) => tag.trim()).filter(Boolean),
      preview: createPreview(draftContent),
    });
    setEditing(false);
  }

  return (
    <article className={selected ? "memory-card selected" : "memory-card"}>
      <div className="memory-card-top">
        <span>{recordLabel(memory.kind)} / {memory.source}</span>
        <strong>{memory.score}</strong>
      </div>
      {editing ? (
        <div className="edit-stack">
          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
          <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} />
          <input value={draftTags} onChange={(event) => setDraftTags(event.target.value)} />
        </div>
      ) : (
        <>
          <h3>{memory.isPrivate ? "Private memory" : memory.payload.title}</h3>
          {memory.isPrivate ? null : <ScenePreview memory={memory} />}
          <p>{memory.isPrivate ? "This memory is marked private." : memoryPreview(memory) || memory.payload.content}</p>
          {memory.payload.url ? (
            <a className="memory-url" href={memory.payload.url} target="_blank" rel="noreferrer">
              {memory.payload.url}
            </a>
          ) : null}
          <div className="memory-tags">
            {memory.tags.slice(0, 8).map((tag) => (
              <button key={tag} type="button" onClick={() => setQuery(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="card-actions">
        <label title="Add this memory to the Selection Pack for copying or export">
          <input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} />
          Pack
        </label>
        <button type="button" onClick={() => (editing ? void saveEdit() : setEditing(true))}>
          {editing ? <Check size={15} /> : <Pencil size={15} />}
          {editing ? "Save" : "Edit"}
        </button>
        <button type="button" onClick={() => void update({ ...memory, isPrivate: !memory.isPrivate })}>
          {memory.isPrivate ? "Public" : "Private"}
        </button>
        <button type="button" onClick={() => {
          if (window.confirm("Delete this memory? This cannot be undone.")) {
            void remove(memory.id);
          }
        }}>
          <Trash2 size={15} />
        </button>
      </div>
      <footer>
        <span>{new Date(memory.capturedAt).toLocaleDateString()}</span>
        <button type="button" onClick={onOpen}>Details</button>
      </footer>
    </article>
  );
}

function MemoryDetailDrawer({
  memory,
  selected,
  onSelect,
  onClose,
}: {
  memory: MemoryObject;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onClose: () => void;
}) {
  const { update, remove } = useMemoryStore();
  const [title, setTitle] = useState(memory.payload.title);
  const [content, setContent] = useState(memory.payload.content);
  const [url, setUrl] = useState(memory.payload.url ?? "");
  const [tags, setTags] = useState(memory.tags.join(", "));

  async function save() {
    await update({
      ...memory,
      payload: { title: title.trim() || "Untitled memory", content: content.trim(), url: url.trim() || undefined },
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      preview: createPreview(content),
    });
    onClose();
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="memory-drawer" role="dialog" aria-label="Memory details" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Memory Detail</span>
            <h2>{memory.payload.title}</h2>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <div className="drawer-grid">
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            URL
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Tags
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label>
            Raw memory
            <textarea value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
        </div>
        <section className="drawer-meta">
          <span>{recordLabel(memory.kind)}</span>
          <span>{memory.source}</span>
          <span>{new Date(memory.capturedAt).toLocaleString()}</span>
          <span>{memory.contentHash.slice(0, 20)}</span>
        </section>
        {Object.keys(memory.fields ?? {}).length ? (
          <section className="drawer-fields">
            <strong>Structured Fields</strong>
            <div>
              {Object.entries(memory.fields ?? {}).map(([key, value]) => (
                <span key={key}>
                  <em>{key}</em>
                  {String(value)}
                </span>
              ))}
            </div>
          </section>
        ) : null}
        <section className="drawer-summary">
          <strong>Preview</strong>
          <p>{createPreview(content)}</p>
        </section>
        <div className="drawer-actions">
          <button type="button" onClick={() => onSelect(!selected)}>
            <Archive size={15} />
            {selected ? "Remove from Pack" : "Add to Pack"}
          </button>
          <button type="button" onClick={() => void update({ ...memory, isPrivate: !memory.isPrivate })}>
            <Shield size={15} />
            {memory.isPrivate ? "Make Public" : "Mark Private"}
          </button>
          <button type="button" onClick={() => void save()}>
            <Check size={15} />
            Save
          </button>
          <button type="button" onClick={() => {
            if (window.confirm("Delete this memory? This cannot be undone.")) {
              void remove(memory.id);
              onClose();
            }
          }}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </aside>
    </div>
  );
}

function ContextPack({ memories, onClear }: { memories: MemoryObject[]; onClear: () => void }) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"compact" | "full" | "archive">("compact");
  const visibleMemories = memories.filter((memory) => !memory.isPrivate);
  const privateCount = memories.length - visibleMemories.length;
  const text = buildContextPack(visibleMemories, mode);

  if (!memories.length) {
    return null;
  }

  return (
    <section className="context-pack">
      <div className="context-pack-main">
        <div className="context-icon">
          <Archive size={17} />
        </div>
        <div>
          <strong>Selection Pack</strong>
          <span>{visibleMemories.length} included. {privateCount ? `${privateCount} private excluded. ` : ""}Copy selected memories as a portable text bundle.</span>
        </div>
      </div>
      <div className="context-actions">
        <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} title="Choose pack output format">
          <option value="compact">Compact</option>
          <option value="full">Full</option>
          <option value="archive">Archive</option>
        </select>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
          title="Copy selected memories as a structured text bundle"
        >
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? "Copied" : "Copy pack"}
        </button>
        <button type="button" onClick={onClear} title="Remove all memories from the current selection pack">
          Clear
        </button>
      </div>
    </section>
  );
}

function BookmarkImport() {
  const importMany = useMemoryStore((state) => state.importMany);

  async function importBookmarks(file: File) {
    const html = await file.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a[href]")).slice(0, 500);
    await importMany(
      anchors.map((anchor) => {
        const href = anchor.getAttribute("href") ?? "";
        const title = anchor.textContent?.trim() || href;
        return {
          title,
          content: `${title}\n${href}`,
          url: href,
          source: "browser" as const,
          tags: ["bookmark", "browser", domainTag(href) ?? ""],
        };
      }),
    );
  }

  return (
    <label className="bookmark-import" title="Import Chrome or Edge exported bookmarks HTML">
      <FileText size={16} />
      Import bookmarks
      <input type="file" accept=".html,.htm,text/html" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          void importBookmarks(file);
        }
        event.currentTarget.value = "";
      }} />
    </label>
  );
}

function TextImport() {
  const importMany = useMemoryStore((state) => state.importMany);

  async function importText(file: File) {
    const text = await file.text();
    const chunks = splitImportText(text);
    await importMany(
      chunks.map((chunk, index) => ({
        title: inferImportTitle(chunk, file.name, index),
        content: chunk,
        source: "file" as const,
        tags: ["import", file.name.replace(/\.[^.]+$/, "")],
      })),
    );
  }

  return (
    <label className="bookmark-import" title="Import Markdown or plain text files">
      <Upload size={16} />
      Import text
      <input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          void importText(file);
        }
        event.currentTarget.value = "";
      }} />
    </label>
  );
}

function JsonExport({ memories }: { memories: MemoryObject[] }) {
  function exportJson() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), memories }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mory-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="ghost-button" type="button" onClick={exportJson} title="Export the local memory repository as JSON">
      <Download size={16} />
      Export JSON
    </button>
  );
}

function JsonImport() {
  const importMany = useMemoryStore((state) => state.importMany);
  const [error, setError] = useState("");

  async function importJson(file: File) {
    setError("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const records = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { memories?: unknown }).memories)
          ? (parsed as { memories: unknown[] }).memories
          : null;

      if (!records) {
        throw new Error("JSON must contain a memories array.");
      }
      if (!records.length) {
        throw new Error("JSON contains no memory records.");
      }

      const recordErrors: string[] = [];
      const inputs = records.flatMap((record, index) => {
        try {
          if (!record || typeof record !== "object") {
            throw new Error(`Record ${index + 1} is not an object.`);
          }

          const item = record as {
            payload?: { title?: unknown; content?: unknown; url?: unknown };
            title?: unknown;
            content?: unknown;
            url?: unknown;
            source?: MemorySource;
            kind?: MemoryKind;
            type?: "raw" | "preview" | "snapshot" | "relation";
            fields?: Record<string, string | number | boolean | undefined>;
            tags?: unknown;
            capturedAt?: unknown;
            isPrivate?: unknown;
          };
          const payload = item.payload;
          const title = typeof payload?.title === "string" ? payload.title : typeof item.title === "string" ? item.title : "";
          const content = typeof payload?.content === "string" ? payload.content : typeof item.content === "string" ? item.content : "";

          if (!title.trim() && !content.trim()) {
            throw new Error(`Record ${index + 1} needs a title or content.`);
          }

          return [{
            title,
            content,
            url: typeof payload?.url === "string" ? payload.url : typeof item.url === "string" ? item.url : undefined,
            source: item.source,
            kind: item.kind,
            type: item.type,
            fields: item.fields,
            tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
            capturedAt: typeof item.capturedAt === "string" ? item.capturedAt : undefined,
            isPrivate: typeof item.isPrivate === "boolean" ? item.isPrivate : undefined,
          }];
        } catch (recordError) {
          recordErrors.push(recordError instanceof Error ? recordError.message : `Record ${index + 1} is invalid.`);
          return [];
        }
      });

      if (!inputs.length) {
        throw new Error(recordErrors.join(" ") || "JSON contains no valid memory records.");
      }
      await importMany(inputs);
      if (recordErrors.length) {
        setError(`Imported ${inputs.length}; skipped ${recordErrors.length} invalid record${recordErrors.length === 1 ? "" : "s"}. ${recordErrors.join(" ")}`);
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Invalid JSON file.");
    }
  }

  return (
    <label className="bookmark-import" title="Import a Mory JSON export">
      <Upload size={16} />
      Import JSON
      <input type="file" accept=".json,application/json" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          void importJson(file);
        }
        event.currentTarget.value = "";
      }} />
      {error ? <span className="import-error">{error}</span> : null}
    </label>
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

function recordIcon(kind?: MemoryKind) {
  if (kind === "chat") {
    return <MessageCircle size={17} />;
  }

  if (kind === "bill") {
    return <ReceiptText size={17} />;
  }

  if (kind === "finance") {
    return <Landmark size={17} />;
  }

  if (kind === "task") {
    return <CheckSquare size={17} />;
  }

  if (kind === "waiting") {
    return <Hourglass size={17} />;
  }

  if (kind === "bookmark") {
    return <Link size={17} />;
  }

  if (kind === "file") {
    return <FileCheck2 size={17} />;
  }

  if (kind === "decision") {
    return <BookOpenCheck size={17} />;
  }

  if (kind === "log") {
    return <NotebookPen size={17} />;
  }

  return <Archive size={17} />;
}

function recordLabel(kind?: MemoryKind): string {
  const found = recordModes.find((mode) => mode.kind === kind);
  return found?.label ?? "Note";
}

function recordHint(kind?: MemoryKind): string {
  const found = recordModes.find((mode) => mode.kind === kind);
  return found?.hint ?? "Freeform memory";
}

function titlePlaceholder(kind: MemoryKind): string {
  if (kind === "chat") {
    return "Conversation title, or leave it for Mory to infer";
  }

  if (kind === "bill") {
    return "Bill title, project, or subscription name";
  }

  if (kind === "bookmark") {
    return "Page title, article name, or reference label";
  }

  if (kind === "finance") {
    return "Financial record title, account, asset, or transaction";
  }

  if (kind === "task") {
    return "Task title or action item";
  }

  if (kind === "waiting") {
    return "Waiting item or follow-up title";
  }

  if (kind === "file") {
    return "Document title or file reference";
  }

  if (kind === "decision") {
    return "Decision title";
  }

  if (kind === "log") {
    return "Log title, habit, day, project, or event";
  }

  return "Give this memory a name, or leave it for Mory to infer";
}

function contentPlaceholder(kind: MemoryKind): string {
  if (kind === "chat") {
    return "Write messages, decisions, or conversation fragments. Example:\nMe: ...\nPartner: ...";
  }

  if (kind === "bill") {
    return "Optional bill note: why it happened, project relation, receipt detail, reimbursement status...";
  }

  if (kind === "bookmark") {
    return "Optional page note: why this link matters, what to remember, related project...";
  }

  if (kind === "finance") {
    return "Optional finance note: why it changed, source, account detail, tax/reimbursement context...";
  }

  if (kind === "task") {
    return "Describe the task, acceptance criteria, blockers, or next step...";
  }

  if (kind === "waiting") {
    return "Record what you are waiting for, what happened, and when to follow up...";
  }

  if (kind === "file") {
    return "Describe what this file contains, where it belongs, and why it matters...";
  }

  if (kind === "decision") {
    return "Record the decision, options considered, reason, owner, and consequences...";
  }

  if (kind === "log") {
    return "Write what happened, metrics, state, observation, or timeline notes...";
  }

  return "Paste a decision, page note, meeting context, link, or fragment worth remembering.";
}

function ScenePreview({ memory }: { memory: MemoryObject }) {
  if (memory.kind === "bill") {
    return (
      <div className="scene-preview bill-preview">
        <strong>{fieldText(memory, "amount") || "--"}</strong>
        <span>{fieldText(memory, "merchant") || "Unknown merchant"}</span>
        <em>{fieldText(memory, "category") || "uncategorized"}</em>
      </div>
    );
  }

  if (memory.kind === "chat") {
    return (
      <div className="scene-preview chat-preview">
        <MessageCircle size={15} />
        <span>{fieldText(memory, "with") || "Conversation record"}</span>
      </div>
    );
  }

  if (memory.kind === "finance") {
    return (
      <div className="scene-preview bill-preview finance-preview">
        <strong>{[fieldText(memory, "amount"), fieldText(memory, "currency")].filter(Boolean).join(" ") || "--"}</strong>
        <span>{fieldText(memory, "account") || "Financial record"}</span>
        <em>{fieldText(memory, "type") || "uncategorized"}</em>
      </div>
    );
  }

  if (memory.kind === "task") {
    return (
      <div className="scene-preview status-preview">
        <CheckSquare size={15} />
        <span>{fieldText(memory, "status") || "todo"}</span>
        <em>{fieldText(memory, "due") || "no due date"}</em>
      </div>
    );
  }

  if (memory.kind === "waiting") {
    return (
      <div className="scene-preview status-preview waiting-preview">
        <Hourglass size={15} />
        <span>{fieldText(memory, "waitingFor") || "Waiting"}</span>
        <em>{fieldText(memory, "followUp") || fieldText(memory, "status") || "pending"}</em>
      </div>
    );
  }

  if (memory.kind === "bookmark") {
    return (
      <div className="scene-preview bookmark-preview">
        <Globe size={15} />
        <span>{fieldText(memory, "domain") || safeHostname(memory.payload.url) || "Web reference"}</span>
      </div>
    );
  }

  if (memory.kind === "file") {
    return (
      <div className="scene-preview bookmark-preview">
        <FileCheck2 size={15} />
        <span>{fieldText(memory, "fileName") || fieldText(memory, "filePath") || "File reference"}</span>
      </div>
    );
  }

  if (memory.kind === "decision") {
    return (
      <div className="scene-preview status-preview">
        <BookOpenCheck size={15} />
        <span>{fieldText(memory, "status") || "decision"}</span>
        <em>{fieldText(memory, "owner") || "no owner"}</em>
      </div>
    );
  }

  if (memory.kind === "log") {
    return (
      <div className="scene-preview status-preview">
        <NotebookPen size={15} />
        <span>{fieldText(memory, "date") || "Log"}</span>
        <em>{fieldText(memory, "mood") || "entry"}</em>
      </div>
    );
  }

  return null;
}

function fieldText(memory: MemoryObject, key: string): string {
  const value = memory.fields?.[key];
  return value === undefined ? "" : String(value);
}

function safeHostname(url?: string): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function Notice({ text, tone, onRetry }: { text: string; tone: "good" | "bad"; onRetry?: () => void }) {
  return (
    <div className={`notice ${tone}`} role={tone === "bad" ? "alert" : "status"}>
      <span>{text}</span>
      {onRetry ? <button type="button" onClick={onRetry}>Retry</button> : null}
    </div>
  );
}

function buildCollections(memories: MemoryObject[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    for (const tag of memory.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));
}

function buildContextPack(memories: MemoryObject[], mode: "compact" | "full" | "archive"): string {
  const header = mode === "archive" ? "Mory Archive Pack" : "Mory Selection Pack";

  const body = memories.map((memory, index) => {
    const url = memory.payload.url ? `\nURL: ${memory.payload.url}` : "";
    const content = mode === "compact" ? "" : `\nContent:\n${memory.payload.content}`;
    const hash = mode === "archive" ? `\nHash: ${memory.contentHash}` : "";
    return `## Memory ${index + 1}: ${memory.payload.title}\nSource: ${memory.source}\nTags: ${memory.tags.join(", ")}${url}${hash}\nPreview: ${memoryPreview(memory) || createPreview(memory.payload.content)}${content}`;
  });

  return [header, ...body].join("\n\n---\n\n");
}

function memoryPreview(memory: MemoryObject): string {
  return memory.preview ?? memory.summary ?? "";
}

function splitImportText(text: string): string[] {
  return text
    .split(/\n\s*---\s*\n|\n\s*#{1,2}\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function inferImportTitle(chunk: string, filename: string, index: number): string {
  const firstLine = chunk.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return firstLine ? firstLine.slice(0, 72) : `${filename} ${index + 1}`;
}
