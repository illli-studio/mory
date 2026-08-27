import { useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
} from "lucide-react";
import { createPreview, domainTag, extractUrls, type MemoryKind, type MemoryObject, type MemorySource } from "@mory/memory-core";
import { selectFilteredMemories, selectStats, useMemoryStore } from "./store";
import { backupRemoteGithub, getMoryApiConfig, hasMoryApiConfig, setMoryApiConfig } from "./mory-api";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Dialog, DialogContent } from "./components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { MoryLogo } from "./components/mory-logo";

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
  const [selectionMode, setSelectionMode] = useState(false);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureKind, setCaptureKind] = useState<MemoryKind>("note");
  const recordNavRef = useRef<HTMLDivElement>(null);
  const [compactRecordNav, setCompactRecordNav] = useState(false);
  const selectedMemories = useMemo(() => store.memories.filter((memory) => selectedIds.includes(memory.id)), [store.memories, selectedIds]);
  const activeMemory = useMemo(() => store.memories.find((memory) => memory.id === activeMemoryId), [store.memories, activeMemoryId]);
  const selectedRecordKind = recordModes.some((mode) => mode.kind === query) ? query as MemoryKind : "note";

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!captureOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [captureOpen]);

  useEffect(() => {
    const nav = recordNavRef.current;
    if (!nav) return;
    const measure = () => setCompactRecordNav(nav.scrollWidth > nav.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="product-shell">
      <header className="product-header">
        <div className="brand-lockup">
          <div className="brand-glyph logo-mark">
            <MoryLogo size={38} />
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
          <Button variant="ghost" className="nav-brand-card" type="button" onClick={() => setCaptureOpen(true)} aria-label="Open memory capture">
            <div className="brand-glyph logo-mark">
              <MoryLogo size={38} />
            </div>
            <div>
              <strong>Mory</strong>
              <span>Storehouse</span>
            </div>
          </Button>
          <div className="nav-section-label">Record types</div>
          <div ref={recordNavRef} className={compactRecordNav ? "record-nav-list measure-only" : "record-nav-list"}>
            {recordModes.map((mode) => {
              const count = store.memories.filter((memory) => (memory.kind ?? "note") === mode.kind).length;
              return (
                <Button key={mode.kind} variant="ghost" type="button" onClick={() => { setActiveUtilityPanel(null); setQuery(mode.kind === "note" ? "" : mode.kind); }}>
                  {recordIcon(mode.kind)}
                  <span>{mode.label}</span>
                  <strong>{count}</strong>
                </Button>
              );
            })}
          </div>
          {compactRecordNav ? <RecordTypeSelect value={selectedRecordKind} onChange={(value) => { setActiveUtilityPanel(null); setQuery(value === "note" ? "" : value); }} /> : null}
          <div className="nav-section-label">Shortcuts</div>
          <div className="shortcut-list">
              <Button variant="ghost" type="button" onClick={() => { setActiveUtilityPanel(null); setQuery("private"); }}>Private</Button>
              <Button variant="ghost" type="button" onClick={() => { setActiveUtilityPanel(null); setQuery("waiting"); }}>Waiting</Button>
              <Button variant="ghost" type="button" onClick={() => { setActiveUtilityPanel(null); setQuery("bookmark"); }}>Bookmarks</Button>
          </div>
          <div className="nav-section-label">Manage</div>
          <div className="utility-nav-list">
            <UtilityNavButton icon={<SlidersHorizontal size={16} />} label="Settings" active={activeUtilityPanel !== null} onClick={() => toggleUtilityPanel("access")} />
          </div>
        </aside>
        <div className="workspace-main">
        {activeUtilityPanel ? (
          <SettingsPage panel={activeUtilityPanel} stats={stats} memories={store.memories} onPanelChange={setActiveUtilityPanel} onConnected={() => void load()} />
        ) : (
          <section className="feed-section">
            <div className="feed-controls">
              <div className="command-bar">
              <label className="search-input">
                <Search size={18} />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memories, tags, links, bills, tasks..." />
              </label>
              <SourceSelect value={source as MemorySource | "all"} onChange={setSource} options={sources} />
              </div>

              <AdvancedFilters />
            </div>

            {error ? <Notice tone="bad" text={error} onRetry={() => void load()} /> : null}
            {syncMessage ? <Notice tone="good" text={syncMessage} /> : null}
            <ContextPack memories={selectedMemories} onClear={() => setSelectedIds([])} />
            <div className="section-heading">
              <div>
                <h2>Memory Feed</h2>
                <p>{memories.length} of {stats.total} memories</p>
              </div>
              <div className="feed-summary" aria-label="Repository summary">
                <span><strong>{stats.today}</strong> today</span>
                <span><strong>{stats.tags.length}</strong> topics</span>
              </div>
              <div className="feed-actions" aria-label="Repository actions">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><Upload size={16} /> Import</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild><BookmarkImport /></DropdownMenuItem>
                    <DropdownMenuItem asChild><TextImport /></DropdownMenuItem>
                    <DropdownMenuItem asChild><JsonImport /></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <JsonExport memories={store.memories} />
              </div>
            </div>
            <MemoryFeed memories={memories} loading={isLoading} />
          </section>
        )}
        </div>

      </section>
      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
          <DialogContent className="capture-modal" aria-label="Capture a memory">
            <header className="capture-modal-header">
              <div>
                <span className="eyebrow"><Archive size={15} /> New memory</span>
                <h2>Capture something worth keeping</h2>
              </div>
            </header>
            <div className="capture-modal-body">
              <CaptureConsole kind={captureKind} onKindChange={setCaptureKind} />
            </div>
          </DialogContent>
      </Dialog>
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
          <h3>{query ? "No memories match this filter." : "Your memory repository is waiting."}</h3>
          <p>{query ? `Nothing matched “${query}”. Try another search or clear the filter.` : "Capture the first object above and this area becomes your living memory feed."}</p>
          {query ? <Button variant="outline" type="button" onClick={() => setQuery("")}>Clear search</Button> : null}
        </div>
      );
    }

    return (
      <>
        <div className={selectionMode ? "memory-list-header selection-mode" : "memory-list-header"}>
        {selectionMode ? (
          <Button variant="ghost" className="selection-toggle" type="button" onClick={() => setSelectionMode(false)} aria-label="Exit selection mode">Done</Button>
        ) : (
          <Button variant="ghost" className="selection-toggle" type="button" onClick={() => setSelectionMode(true)} aria-label="Enter selection mode">Select</Button>
        )}
        <span>Time</span>
        <span>Entity</span>
        <span>Memory content</span>
        <span>Category</span>
        <span>Lifecycle</span>
        </div>
        <div className={selectionMode ? "memory-grid selection-mode" : "memory-grid"}>
        {memories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            selectionMode={selectionMode}
            selected={selectedIds.includes(memory.id)}
            onSelect={(checked) => setSelectedIds((current) => (checked ? [...new Set([...current, memory.id])] : current.filter((id) => id !== memory.id)))}
            onOpen={() => setActiveMemoryId(memory.id)}
          />
        ))}
        </div>
      </>
    );
  }

  function toggleUtilityPanel(panel: UtilityPanel) {
    setActiveUtilityPanel((current) => (current === panel ? null : panel));
  }
}

type UtilityPanel = "health" | "collections" | "access" | "github" | "connectors";

const utilityPanels: Array<{ value: UtilityPanel; label: string }> = [
  { value: "access", label: "Mory API" },
  { value: "github", label: "GitHub" },
  { value: "connectors", label: "Connectors" },
  { value: "collections", label: "Topics" },
  { value: "health", label: "Health" },
];

function UtilityNavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <Button variant="ghost" className={active ? "utility-nav-button active" : "utility-nav-button"} type="button" onClick={onClick} aria-pressed={active}>
      {icon}
      <span>{label}</span>
      <ChevronDown size={14} />
    </Button>
  );
}

function SettingsPage({
  panel,
  stats,
  memories,
  onPanelChange,
  onConnected,
}: {
  panel: UtilityPanel;
  stats: ReturnType<typeof selectStats>;
  memories: MemoryObject[];
  onPanelChange: (panel: UtilityPanel | null) => void;
  onConnected: () => void;
}) {
  const settingsTabsRef = useRef<HTMLDivElement>(null);
  const [compactSettingsTabs, setCompactSettingsTabs] = useState(false);

  useEffect(() => {
    const tabs = settingsTabsRef.current;
    if (!tabs) return;
    const measure = () => setCompactSettingsTabs(tabs.scrollWidth > tabs.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="settings-page">
      <header className="settings-page-header">
        <div>
          <span className="eyebrow"><SlidersHorizontal size={15} /> Repository settings</span>
          <h1>Settings</h1>
          <p>Manage connections and repository tools in one place.</p>
        </div>
      </header>
      <Tabs value={panel} onValueChange={(value) => onPanelChange(value as UtilityPanel)}>
      <TabsList ref={settingsTabsRef} className={compactSettingsTabs ? "settings-tabs measure-only" : "settings-tabs"} aria-label="Settings sections">
        {utilityPanels.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>
        ))}
      </TabsList>
      </Tabs>
      {compactSettingsTabs ? (
        <div className="settings-select">
          <InlineSelect value={panel} onChange={(value) => onPanelChange(value as UtilityPanel)} options={utilityPanels.map((item) => ({ value: item.value, label: item.label }))} />
        </div>
      ) : null}
      <div className="settings-content">
        {panel === "health" ? <SystemHealth stats={stats} /> : null}
        {panel === "collections" ? <CollectionsPanel memories={memories} /> : null}
        {panel === "access" ? <MoryAccessCard onConnected={onConnected} /> : null}
        {panel === "github" ? <GithubSyncCard /> : null}
        {panel === "connectors" ? <ConnectorRail /> : null}
      </div>
    </section>
  );
}

function MoryAccessCard({ onConnected }: { onConnected: () => void }) {
  const initial = getMoryApiConfig();
  const [url, setUrl] = useState(initial.url);
  const [token, setToken] = useState(initial.token);
  const connected = hasMoryApiConfig();

  function save() {
    setMoryApiConfig({ url, token });
    onConnected();
  }

  return (
    <section className="side-card sync-card">
      <div className="card-title"><Cloud size={17} /><h3>Mory API</h3></div>
      <p className="sync-note">Connect the website and Hermes to one shared memory repository.</p>
      <Input value={url} onChange={(event) => setUrl(event.target.value)} aria-label="Mory API URL" placeholder="http://127.0.0.1:8787" />
      <Input className="token-input" type="password" value={token} onChange={(event) => setToken(event.target.value)} aria-label="Mory API token" placeholder="Mory API token" />
      <div className="sync-actions">
        <Button className="primary-action" type="button" onClick={save}>{connected ? "Reconnect" : "Connect"}</Button>
        <span className="connector-status">{connected ? "Connected" : "Local browser mode"}</span>
      </div>
    </section>
  );
}

function CaptureConsole({ kind, onKindChange }: { kind: MemoryKind; onKindChange: (kind: MemoryKind) => void }) {
  const { add } = useMemoryStore();
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
  const [submitting, setSubmitting] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const setKind = onKindChange;
  const recordTabsRef = useRef<HTMLDivElement>(null);
  const [compactRecordPicker, setCompactRecordPicker] = useState(false);

  useEffect(() => {
    const tabs = recordTabsRef.current;
    if (!tabs) return;

    const measure = () => setCompactRecordPicker(tabs.scrollWidth > tabs.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    return () => observer.disconnect();
  }, []);

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
        <div ref={recordTabsRef} className={compactRecordPicker ? "record-mode-tabs measure-only" : "record-mode-tabs"} role="tablist" aria-label="Record type">
          {recordModes.map((mode) => (
            <Button variant="outline" key={mode.kind} type="button" className={kind === mode.kind ? "active" : ""} onClick={() => setKind(mode.kind)} title={mode.hint}>
              {recordIcon(mode.kind)}
              <span>{mode.label}</span>
            </Button>
          ))}
        </div>
        {compactRecordPicker ? <RecordTypeSelect value={kind} onChange={(value) => setKind(value as MemoryKind)} /> : null}
      </div>
      <div className="capture-top">
        {recordIcon(kind)}
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={titlePlaceholder(kind)} />
      </div>
      <div className="scene-panel">{renderSceneFields()}</div>
      <Textarea className={kind === "chat" ? "chat-textarea" : ""} value={content} onChange={(event) => setContent(event.target.value)} placeholder={contentPlaceholder(kind)} />
      <div className="capture-bottom">
        <SourceSelect value={kind === "chat" ? "chat" : source} onChange={(value) => setSource(value as MemorySource)} options={sources.filter((item) => item.value !== "all")} />
        <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags: product, mory, research" />
        <Button variant="secondary" className="clipboard-action" type="button" onClick={() => void pasteFromClipboard()}>
          <Clipboard size={17} />
          Paste
        </Button>
        <Button type="submit">
          {saved ? <Check size={17} /> : <Send size={17} />}
          {saved ? "Saved" : "Capture"}
        </Button>
      </div>
      {clipboardMessage ? <p className="capture-hint" role="status" aria-live="polite">{clipboardMessage}</p> : null}
      <span className="sr-only" aria-live="polite">{saved ? "Memory saved." : ""}</span>
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
          <Input value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="Amount, e.g. 68.90" inputMode="decimal" />
          <Input value={billMerchant} onChange={(event) => setBillMerchant(event.target.value)} placeholder="Merchant or payee" />
          <Input value={billCategory} onChange={(event) => setBillCategory(event.target.value)} placeholder="Category, e.g. food, infra, travel" />
          <Input value={billDate} onChange={(event) => setBillDate(event.target.value)} type="date" />
        </div>
      );
    }

    if (kind === "chat") {
      return <div className="scene-fields"><Input value={chatWith} onChange={(event) => setChatWith(event.target.value)} placeholder="Conversation with / channel / room" /></div>;
    }

    if (kind === "finance") {
      return (
        <div className="scene-fields finance-fields">
          <Input value={financeAmount} onChange={(event) => setFinanceAmount(event.target.value)} placeholder="Amount / value" inputMode="decimal" />
          <Input value={financeCurrency} onChange={(event) => setFinanceCurrency(event.target.value.toUpperCase())} placeholder="Currency" />
          <Input value={financeAccount} onChange={(event) => setFinanceAccount(event.target.value)} placeholder="Account / asset / wallet" />
          <Input value={financeType} onChange={(event) => setFinanceType(event.target.value)} placeholder="Type: income, asset, debt, transfer" />
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
          <Input value={taskDue} onChange={(event) => setTaskDue(event.target.value)} type="date" />
          <Input value={taskOwner} onChange={(event) => setTaskOwner(event.target.value)} placeholder="Owner / project" />
        </div>
      );
    }

    if (kind === "waiting") {
      return (
        <div className="scene-fields task-fields">
          <Input value={waitingFor} onChange={(event) => setWaitingFor(event.target.value)} placeholder="Waiting for person / event / reply" />
          <Input value={waitingDue} onChange={(event) => setWaitingDue(event.target.value)} type="date" />
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
      return <div className="scene-fields"><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/page" /></div>;
    }

    if (kind === "file") {
      return (
        <div className="scene-fields task-fields">
          <Input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="File name" />
          <Input value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="Path, drive URL, or storage location" />
        </div>
      );
    }

    if (kind === "decision") {
      return (
        <div className="scene-fields task-fields">
          <Input value={decisionOwner} onChange={(event) => setDecisionOwner(event.target.value)} placeholder="Owner / team / project" />
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
        <Input value={logDate} onChange={(event) => setLogDate(event.target.value)} type="date" />
        <Input value={logMood} onChange={(event) => setLogMood(event.target.value)} placeholder="Mood, state, metric, or location" />
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
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as MemorySource | "all")}>
      <SelectTrigger className="source-trigger"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function RecordTypeSelect({ value, onChange }: { value: MemoryKind; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="source-trigger" aria-label="Record type"><SelectValue /></SelectTrigger>
      <SelectContent>
        {recordModes.map((mode) => <SelectItem key={mode.kind} value={mode.kind}>{mode.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function InlineSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="inline-trigger"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
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
      <InlineSelect
        value={timeRange}
        onChange={(value) => setTimeRange(value as typeof timeRange)}
        options={[{ value: "all", label: "Any time" }, { value: "today", label: "Today" }, { value: "week", label: "Last 7 days" }, { value: "month", label: "Last 30 days" }]}
      />
      <InlineSelect
        value={privacy}
        onChange={(value) => setPrivacy(value as typeof privacy)}
        options={[{ value: "all", label: "All visibility" }, { value: "public", label: "Public only" }, { value: "private", label: "Private only" }]}
      />
      <Input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} placeholder="filter tag" title="Filter by tag" />
      <InlineSelect
        value={sortBy}
        onChange={(value) => setSortBy(value as typeof sortBy)}
        options={[{ value: "newest", label: "Newest first" }, { value: "score", label: "Score first" }]}
      />
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
        <span>Repository active</span>
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
            <Button variant="ghost" key={collection.tag} type="button" onClick={() => setQuery(collection.tag)}>
              <span>#{collection.tag}</span>
              <strong>{collection.count}</strong>
            </Button>
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
  const [backupMessage, setBackupMessage] = useState("");
  const privateCount = memories.filter((memory) => memory.isPrivate).length;

  return (
    <section className="side-card sync-card">
      <div className="card-title">
        <Github size={17} />
        <h3>GitHub Sync</h3>
      </div>
      <div className="sync-grid">
        <Input value={github.owner} onChange={(event) => updateGithub({ owner: event.target.value })} aria-label="GitHub owner" />
        <Input value={github.repo} onChange={(event) => updateGithub({ repo: event.target.value })} aria-label="GitHub repo" />
        <Input value={github.branch} onChange={(event) => updateGithub({ branch: event.target.value })} aria-label="GitHub branch" />
        <Input value={github.path} onChange={(event) => updateGithub({ path: event.target.value })} aria-label="GitHub sync path" />
      </div>
      <Input className="token-input" type="password" value={github.token} onChange={(event) => updateGithub({ token: event.target.value })} placeholder="GitHub token with contents read/write" />
      <div className={privateCount ? "sync-warning" : "sync-note"}>
        {privateCount ? `${privateCount} private memories are included in sync/export unless you remove them first.` : "Token is kept in page state and is not restored after refresh."}
      </div>
      <div className="sync-actions">
        <Button className="primary-action" type="button" onClick={() => void mergeGithub()}>
          <Cloud size={16} />
          Merge sync
        </Button>
        <Button variant="outline" type="button" onClick={() => void pushGithub()} title={`Push ${memories.length} objects`}>
          <ArrowUpToLine size={16} />
        </Button>
        <Button variant="outline" type="button" onClick={() => void pullGithub()} title="Pull remote repository">
          <ArrowDownToLine size={16} />
        </Button>
      </div>
      <Button variant="ghost" className="ghost-button sqlite-backup-button" type="button" onClick={async () => {
        setBackupMessage("Backing up SQLite...");
        try {
          const result = await backupRemoteGithub(github);
          setBackupMessage("SQLite + JSON committed (" + result.count + " memories).");
        } catch (error) {
          setBackupMessage(error instanceof Error ? error.message : "SQLite backup failed.");
        }
      }}>Commit SQLite backup</Button>
      {backupMessage ? <p className="sync-note">{backupMessage}</p> : null}
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

function MemoryCard({ memory, selected, selectionMode, onSelect, onOpen }: { memory: MemoryObject; selected: boolean; selectionMode: boolean; onSelect: (checked: boolean) => void; onOpen: () => void }) {
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
    <Card
      className={["memory-card", selectionMode ? "selection-mode" : "", selected ? "selected" : ""].filter(Boolean).join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`Open memory: ${memory.payload.title}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input, textarea, label")) return;
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const target = event.target as HTMLElement;
        if (target.closest("button, input, textarea, label")) return;
        event.preventDefault();
        onOpen();
      }}
    >
      {selectionMode ? (
        <div className="memory-selection-cell">
          <Input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} aria-label={`Select ${memory.payload.title}`} />
        </div>
      ) : null}
      <div className="memory-time">{relativeTime(memory.capturedAt)}</div>
      <div className="memory-entity">
        <strong>{memory.actor?.id || memory.source}</strong>
        <span>{memory.source}</span>
      </div>
      <div className="memory-content-cell">
      {editing ? (
        <div className="edit-stack">
           <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
           <Textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} />
           <Input value={draftTags} onChange={(event) => setDraftTags(event.target.value)} />
        </div>
      ) : (
        <>
          <Button variant="ghost" className="memory-title-button" type="button" onClick={onOpen}>{memory.isPrivate ? "Private memory" : memory.payload.title}</Button>
          <p>{memory.isPrivate ? "This memory is marked private." : memoryPreview(memory) || memory.payload.content}</p>
        </>
      )}
      </div>
      <div className="memory-category">
        <Button variant="ghost" type="button" onClick={() => setQuery(memory.kind || "note")}>{memory.kind || "note"}</Button>
        {memory.tags[0] ? <span>#{memory.tags[0]}</span> : null}
      </div>
        <div className="memory-life"><Badge>Active</Badge><strong>{memory.score}</strong></div>
    </Card>
  );
}

function relativeTime(value: string): string {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return String(minutes) + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return String(hours) + "h ago";
  return String(Math.floor(hours / 24)) + "d ago";
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
  const { update } = useMemoryStore();
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
          <Button variant="outline" type="button" onClick={onClose}>Close</Button>
        </header>
        <div className="drawer-grid">
          <label>
            Title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            URL
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Tags
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label>
            Raw memory
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} />
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
          <Button variant="outline" type="button" onClick={() => onSelect(!selected)}>
            <Archive size={15} />
            {selected ? "Remove from Pack" : "Add to Pack"}
          </Button>
          <Button variant="secondary" type="button" onClick={() => void update({ ...memory, isPrivate: !memory.isPrivate })}>
            <Shield size={15} />
            {memory.isPrivate ? "Make Public" : "Mark Private"}
          </Button>
          <Button type="button" onClick={() => void save()}>
            <Check size={15} />
            Save
          </Button>
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
        <InlineSelect
          value={mode}
          onChange={(value) => setMode(value as typeof mode)}
          options={[{ value: "compact", label: "Compact" }, { value: "full", label: "Full" }, { value: "archive", label: "Archive" }]}
        />
        <Button
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
        </Button>
        <Button variant="outline" type="button" onClick={onClear} title="Remove all memories from the current selection pack">
          Clear
        </Button>
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
      <Input type="file" accept=".html,.htm,text/html" onChange={(event) => {
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
      <Input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={(event) => {
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
    <Button variant="outline" type="button" onClick={exportJson} title="Export memories">
      <Download size={16} />
      Export
    </Button>
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
      <Input type="file" accept=".json,application/json" onChange={(event) => {
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
        <Button variant="ghost" key={tag.tag} type="button" onClick={() => setQuery(tag.tag)}>
          #{tag.tag}
          <span>{tag.count}</span>
        </Button>
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
    <div className={`notice ${tone}`} role={tone === "bad" ? "alert" : "status"} aria-live={tone === "bad" ? "assertive" : "polite"} aria-atomic="true">
      <span>{text}</span>
      {onRetry ? <Button variant="outline" type="button" onClick={onRetry}>Retry</Button> : null}
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
