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
  CloudCheck,
  CloudOff,
  Database,
  Download,
  FileText,
  Github,
  Globe,
  Link,
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
  Palette,
  Search,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { createPreview, domainTag, extractUrls, type MemoryKind, type MemoryObject, type MemorySource } from "@mory/memory-core";
import { checkGithubConnection, parseRepositoryUrl } from "./github-sync";
import { selectFilteredMemories, selectStats, useMemoryStore } from "./store";
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
import { useLanguage, type Language, type TranslationKey } from "./i18n";
import { themes, useTheme } from "./theme";

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
  const { t } = useLanguage();
  const store = useMemoryStore();
  const { load, error, query, setQuery, kindFilter, setKindFilter, source, setSource, isLoading } = store;
  const memories = useMemo(() => selectFilteredMemories(store), [store.memories, store.query, store.kindFilter, store.source, store.timeRange, store.privacy, store.tagFilter, store.sortBy]);
  const stats = useMemo(() => selectStats(store), [store.memories]);
  const syncMessage = store.syncMessage ?? "";
  const visibleError = error && !isBackgroundSyncError(error) ? error : undefined;
  const syncConfigured = Boolean(store.github.token && store.github.owner && store.github.repo && store.github.branch && store.github.path);
  const syncStatus = !syncConfigured ? "local" : /^(Pushing|Pulling|Merging)/.test(syncMessage) ? "syncing" : "synced";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureKind, setCaptureKind] = useState<MemoryKind>("note");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const selectedMemories = useMemo(() => store.memories.filter((memory) => selectedIds.includes(memory.id)), [store.memories, selectedIds]);
  const activeMemory = useMemo(() => store.memories.find((memory) => memory.id === activeMemoryId), [store.memories, activeMemoryId]);
  const totalPages = Math.max(1, Math.ceil(memories.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [query, kindFilter, source, store.timeRange, store.privacy, store.tagFilter, store.sortBy]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!store.github.autoSync) return;
    const timer = window.setInterval(() => void store.mergeGithub(), 30_000);
    return () => window.clearInterval(timer);
  }, [store.github.autoSync, store.mergeGithub]);

  useEffect(() => {
    if (!captureOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [captureOpen]);

  return (
    <main className="product-shell">
      <header className="product-header">
        <div className="brand-lockup">
          <div className="brand-glyph logo-mark">
            <MoryLogo size={52} />
          </div>
          <div>
            <strong>Mory</strong>
            <span>{t("localRepository")}</span>
          </div>
        </div>
        <div className="header-actions">
          <Button variant="ghost" className="header-settings" type="button" onClick={() => toggleUtilityPanel("github")} aria-pressed={activeUtilityPanel !== null}>
            <span className="header-settings-icon" aria-hidden="true">
              <SlidersHorizontal size={16} />
              {!syncConfigured ? <span className="header-settings-help">?</span> : null}
            </span>
            <span>{t("settings")}</span>
          </Button>
          <StatusChip status={syncStatus} label={`${t(`sync${syncStatus[0].toUpperCase()}${syncStatus.slice(1)}` as TranslationKey)} · ${stats.total} ${t("objectCount")}`} />
        </div>
      </header>

      <section className="workspace-layout">
        <aside className="workspace-nav" aria-label={t("recordTypes")}>
          <div className="nav-section-label">{t("recordTypes")}</div>
          <div className="record-nav-list all-memory-list">
            <Button variant="ghost" className={kindFilter === "all" ? "active" : ""} type="button" onClick={() => { setActiveUtilityPanel(null); setKindFilter("all"); setQuery(""); }}>
              <Archive size={17} />
              <span>{t("allMemories")}</span>
              <strong>{stats.total}</strong>
            </Button>
          </div>
          <div className="record-nav-list all-types-list">
            {recordModes.map((mode) => {
              const count = store.memories.filter((memory) => (memory.kind ?? "note") === mode.kind).length;
              return (
                <Button key={mode.kind} variant="ghost" className={kindFilter === mode.kind ? "active" : ""} type="button" onClick={() => { setActiveUtilityPanel(null); setKindFilter(mode.kind); setQuery(""); }}>
                  {recordIcon(mode.kind)}
                  <span>{recordLabel(mode.kind, t)}</span>
                  <strong>{count}</strong>
                </Button>
              );
            })}
          </div>
        </aside>
        <div className="workspace-main">
        {activeUtilityPanel ? (
          <SettingsPage panel={activeUtilityPanel} stats={stats} onPanelChange={setActiveUtilityPanel} />
        ) : (
          <section className="feed-section">
            <div className="section-heading">
              <div>
                <Button className="capture-cta feed-capture-button" type="button" onClick={() => setCaptureOpen(true)}>
                  <Archive size={16} />
                  {t("newMemory")}
                </Button>
              </div>
              <div className="feed-summary" aria-label={t("repositorySummary")}>
                <span><strong>{stats.today}</strong> {t("today")}</span>
                <span><strong>{stats.tags.length}</strong> {t("topics")}</span>
              </div>
              <ContextPack memories={selectedMemories} onClear={() => setSelectedIds([])} />
              <div className="feed-actions" aria-label={t("repositoryActions")}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="import-action" aria-label={t("importMemories")} title={t("importMemories")}><ArrowUpToLine size={18} strokeWidth={2} /></Button>
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
            <div className="feed-controls">
              <div className="command-bar">
              <label className="search-input">
                <Search size={18} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} />
              </label>
              <SourceSelect value={source as MemorySource | "all"} onChange={setSource} options={sourceOptions(t)} />
              </div>

              <AdvancedFilters />
            </div>

            {visibleError ? <Notice tone="bad" text={visibleError} onRetry={() => void load()} /> : null}
            <MemoryFeed memories={memories} loading={isLoading} page={currentPage} pageSize={pageSize} totalPages={totalPages} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} />
          </section>
        )}
        </div>

      </section>
      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
          <DialogContent className="capture-modal" aria-label={t("newMemory")}>
            <header className="capture-modal-header">
              <div>
                <span className="eyebrow"><Archive size={15} /> {t("newMemory")}</span>
                <h2>{t("captureTitle")}</h2>
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
          onClose={() => setActiveMemoryId(null)}
        />
      ) : null}
    </main>
  );

  function MemoryFeed({ memories, loading, page, pageSize, totalPages, onPageChange, onPageSizeChange }: { memories: MemoryObject[]; loading: boolean; page: number; pageSize: number; totalPages: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }) {
    if (loading) {
      return (
        <div className="empty-feed" role="status">
          <Hourglass size={26} />
          <h3>{t("loading")}</h3>
          <p>{t("reading")}</p>
        </div>
      );
    }

    if (!memories.length) {
      return (
        <div className="empty-feed">
          <Archive size={26} />
          <h3>{query ? t("noMatch") : t("waitingRepo")}</h3>
          <p>{query ? `${t("nothingMatched")} “${query}”. ${t("tryAnother")}` : t("firstObject")}</p>
          {query ? <Button variant="outline" type="button" onClick={() => setQuery("")}>{t("clearSearch")}</Button> : null}
        </div>
      );
    }

    const pageMemories = memories.slice((page - 1) * pageSize, page * pageSize);

    return (
      <>
        <div className="memory-list-header">
        <div className="memory-selection-cell">
          <Input
            type="checkbox"
            checked={pageMemories.length > 0 && pageMemories.every((memory) => selectedIds.includes(memory.id))}
            onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...pageMemories.map((memory) => memory.id)])] : selectedIds.filter((id) => !pageMemories.some((memory) => memory.id === id)))}
            aria-label={t("selectAll")}
          />
        </div>
        <span>{t("time")}</span>
        <span>{t("entity")}</span>
        <span>{t("memoryContent")}</span>
        <span>{t("category")}</span>
        <span>{t("lifecycle")}</span>
        </div>
        <div className="memory-grid">
        {pageMemories.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            selected={selectedIds.includes(memory.id)}
            onSelect={(checked) => setSelectedIds((current) => (checked ? [...new Set([...current, memory.id])] : current.filter((id) => id !== memory.id)))}
            onOpen={() => setActiveMemoryId(memory.id)}
          />
        ))}
        </div>
        <nav className="memory-pagination" aria-label="Pagination">
          <div className="page-size-options">
            <span>{t("pageSize")}</span>
            {[10, 20, 50].map((size) => <Button key={size} variant={pageSize === size ? "default" : "outline"} type="button" onClick={() => onPageSizeChange(size)} aria-pressed={pageSize === size}>{size}</Button>)}
          </div>
          <div className="page-navigation">
            <Button variant="outline" type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label={t("previousPage")}>‹</Button>
            <span>{page} {t("pageOf")} {totalPages}</span>
            <Button variant="outline" type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label={t("nextPage")}>›</Button>
          </div>
        </nav>
      </>
    );
  }

  function toggleUtilityPanel(panel: UtilityPanel) {
    setActiveUtilityPanel((current) => (current === panel ? null : panel));
  }
}

type UtilityPanel = "health" | "language" | "github" | "connectors" | "theme";

const utilityPanels: Array<{ value: UtilityPanel; label: string }> = [
  { value: "github", label: "Memory Sync" },
  { value: "language", label: "Language" },
  { value: "theme", label: "Theme" },
  { value: "health", label: "Health" },
];

function sourceOptions(t: (key: TranslationKey) => string): Array<{ value: MemorySource | "all"; label: string }> {
  const labels: Record<MemorySource | "all", TranslationKey> = { all: "allSources", manual: "manual", clipboard: "clipboard", browser: "browser", file: "file", chat: "chat", github: "github" };
  return sources.map((source) => ({ ...source, label: t(labels[source.value]) }));
}

function sourceLabel(source: MemorySource, t: (key: TranslationKey) => string): string {
  return sourceOptions(t).find((item) => item.value === source)?.label ?? source;
}

function utilityLabel(value: UtilityPanel, t: (key: TranslationKey) => string): string {
  const keys: Record<UtilityPanel, TranslationKey> = { github: "githubSync", connectors: "connectors", language: "languageSwitch", health: "health", theme: "theme" };
  return t(keys[value]);
}

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
  onPanelChange,
}: {
  panel: UtilityPanel;
  stats: ReturnType<typeof selectStats>;
  onPanelChange: (panel: UtilityPanel | null) => void;
}) {
  const { t } = useLanguage();
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
          <h1>{t("settings")}</h1>
          <p>{t("manageSettings")}</p>
        </div>
      </header>
      <Tabs value={panel} onValueChange={(value) => onPanelChange(value as UtilityPanel)}>
      <TabsList ref={settingsTabsRef} className={compactSettingsTabs ? "settings-tabs measure-only" : "settings-tabs"} aria-label={t("settingsSections")}>
        {utilityPanels.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>{utilityLabel(item.value, t)}</TabsTrigger>
        ))}
      </TabsList>
      </Tabs>
      {compactSettingsTabs ? (
        <div className="settings-select">
          <InlineSelect value={panel} onChange={(value) => onPanelChange(value as UtilityPanel)} options={utilityPanels.map((item) => ({ value: item.value, label: utilityLabel(item.value, t) }))} />
        </div>
      ) : null}
      <div className="settings-content">
        {panel === "health" ? <SystemHealth stats={stats} /> : null}
        {panel === "language" ? <LanguagePanel /> : null}
        {panel === "github" ? <GithubSyncCard /> : null}
        {panel === "theme" ? <ThemePanel /> : null}
      </div>
    </section>
  );
}

function CaptureConsole({ kind, onKindChange }: { kind: MemoryKind; onKindChange: (kind: MemoryKind) => void }) {
  const { t } = useLanguage();
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
    setSubmitting(true);
    try {
      const added = await add({
        title: inferSceneTitle(detectedUrl),
        content: fallbackContent,
        source: nextSource,
        kind,
        url: detectedUrl,
        fields: buildSceneFields(),
        tags: tags.split(","),
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
      setClipboardMessage(t("clipboardLoaded"));
    } catch {
      setClipboardMessage(t("clipboardPermission"));
    }
  }

  return (
    <form className="capture-console" onSubmit={submit}>
      <div className="record-mode-shell">
        <div className="record-mode-current">
          <div className="record-mode-orb">{recordIcon(kind)}</div>
          <div>
            <strong>{recordLabel(kind, t)}</strong>
          </div>
        </div>
        <RecordTypeSelect value={kind} onChange={(value) => setKind(value as MemoryKind)} />
      </div>
      <div className="capture-top">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={titlePlaceholder(kind, t)} />
      </div>
      <div className="scene-panel">{renderSceneFields()}</div>
      <Textarea className={kind === "chat" ? "chat-textarea" : ""} value={content} onChange={(event) => setContent(event.target.value)} placeholder={contentPlaceholder(kind, t)} />
      <div className="capture-bottom">
        <SourceSelect value={kind === "chat" ? "chat" : source} onChange={(value) => setSource(value as MemorySource)} options={sourceOptions(t).filter((item) => item.value !== "all")} />
        <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t("tagsPlaceholder")} />
        <Button variant="secondary" className="clipboard-action" type="button" onClick={() => void pasteFromClipboard()}>
          <Clipboard size={17} />
          {t("paste")}
        </Button>
        <Button type="submit">
          {saved ? <Check size={17} /> : <Send size={17} />}
          {saved ? t("saved") : t("capture")}
        </Button>
      </div>
      {clipboardMessage ? <p className="capture-hint" role="status" aria-live="polite">{clipboardMessage}</p> : null}
      <span className="sr-only" aria-live="polite">{saved ? "Memory saved." : ""}</span>
      {captureError ? <p className="capture-error" role="alert">{captureError}</p> : null}
    </form>
  );

  function renderSceneFields() {
    if (kind === "note") {
      return null;
    }

    if (kind === "bill") {
      return (
        <div className="scene-fields bill-fields">
          <Input value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder={t("amountPlaceholder")} inputMode="decimal" />
          <Input value={billMerchant} onChange={(event) => setBillMerchant(event.target.value)} placeholder={t("merchantPlaceholder")} />
          <Input value={billCategory} onChange={(event) => setBillCategory(event.target.value)} placeholder={t("categoryPlaceholder")} />
          <Input value={billDate} onChange={(event) => setBillDate(event.target.value)} type="date" />
        </div>
      );
    }

    if (kind === "chat") {
      return <div className="scene-fields"><Input value={chatWith} onChange={(event) => setChatWith(event.target.value)} placeholder={t("conversationPlaceholder")} /></div>;
    }

    if (kind === "finance") {
      return (
        <div className="scene-fields finance-fields">
          <Input value={financeAmount} onChange={(event) => setFinanceAmount(event.target.value)} placeholder={t("amountPlaceholder")} inputMode="decimal" />
          <Input value={financeCurrency} onChange={(event) => setFinanceCurrency(event.target.value.toUpperCase())} placeholder={t("currencyPlaceholder")} />
          <Input value={financeAccount} onChange={(event) => setFinanceAccount(event.target.value)} placeholder={t("accountPlaceholder")} />
          <Input value={financeType} onChange={(event) => setFinanceType(event.target.value)} placeholder={t("typePlaceholder")} />
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
              { value: "todo", label: t("todo") },
              { value: "doing", label: t("doing") },
              { value: "done", label: t("done") },
              { value: "blocked", label: t("blocked") },
            ]}
          />
          <Input value={taskDue} onChange={(event) => setTaskDue(event.target.value)} type="date" />
          <Input value={taskOwner} onChange={(event) => setTaskOwner(event.target.value)} placeholder={t("ownerProject")} />
        </div>
      );
    }

    if (kind === "waiting") {
      return (
        <div className="scene-fields task-fields">
          <Input value={waitingFor} onChange={(event) => setWaitingFor(event.target.value)} placeholder={t("waitingPlaceholder")} />
          <Input value={waitingDue} onChange={(event) => setWaitingDue(event.target.value)} type="date" />
          <InlineSelect
            value={waitingStatus}
            onChange={setWaitingStatus}
            options={[
              { value: "waiting", label: t("waiting") },
              { value: "follow-up", label: t("followUp") },
              { value: "received", label: t("received") },
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
          <Input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder={t("fileNamePlaceholder")} />
          <Input value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder={t("pathPlaceholder")} />
        </div>
      );
    }

    if (kind === "decision") {
      return (
        <div className="scene-fields task-fields">
          <Input value={decisionOwner} onChange={(event) => setDecisionOwner(event.target.value)} placeholder={t("ownerTeamProject")} />
          <InlineSelect
            value={decisionStatus}
            onChange={setDecisionStatus}
            options={[
              { value: "proposed", label: t("proposed") },
              { value: "decided", label: t("decided") },
              { value: "reversed", label: t("reversed") },
            ]}
          />
        </div>
      );
    }

    return (
      <div className="scene-fields task-fields">
        <Input value={logDate} onChange={(event) => setLogDate(event.target.value)} type="date" />
        <Input value={logMood} onChange={(event) => setLogMood(event.target.value)} placeholder={t("moodPlaceholder")} />
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
  const { t } = useLanguage();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="source-trigger" aria-label={t("recordTypes")}><SelectValue /></SelectTrigger>
      <SelectContent>
        {recordModes.map((mode) => <SelectItem key={mode.kind} value={mode.kind}>{recordLabel(mode.kind, t)}</SelectItem>)}
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
  const { t } = useLanguage();
  const { setQuery, setKindFilter, source, setSource, timeRange, setTimeRange, privacy, setPrivacy, sortBy, setSortBy } = useMemoryStore();

  function clearFilters() {
    setQuery("");
    setKindFilter("all");
    setSource("all");
    setTimeRange("all");
    setPrivacy("all");
    setSortBy("newest");
  }

  return (
    <section className="advanced-filters">
      <InlineSelect
        value={timeRange}
        onChange={(value) => setTimeRange(value as typeof timeRange)}
        options={[{ value: "all", label: t("anyTime") }, { value: "today", label: t("today") }, { value: "week", label: t("last7") }, { value: "month", label: t("last30") }]}
      />
      <InlineSelect
        value={privacy}
        onChange={(value) => setPrivacy(value as typeof privacy)}
        options={[{ value: "all", label: t("allVisibility") }, { value: "public", label: t("publicOnly") }, { value: "private", label: t("privateOnly") }]}
      />
      <InlineSelect
        value={sortBy}
        onChange={(value) => setSortBy(value as typeof sortBy)}
        options={[{ value: "newest", label: t("newest") }, { value: "score", label: t("score") }]}
      />
    </section>
  );
}

function SystemHealth({ stats }: { stats: ReturnType<typeof selectStats> }) {
  const { t } = useLanguage();
  return (
    <section className="side-card health-card">
      <div className="card-title">
        <Activity size={17} />
        <h3>{t("repositoryHealth")}</h3>
      </div>
      <div className="health-grid">
        <Metric label={t("objects")} value={stats.total} />
        <Metric label="Today" value={stats.today} />
        <Metric label={t("tagsCount")} value={stats.tags.length} />
      </div>
      <div className="mini-signal">
        <Database size={16} />
        <span>{t("repositoryActive")}</span>
        <Check size={15} />
      </div>
    </section>
  );
}

function LanguagePanel() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <section className="side-card language-panel">
      <div className="card-title">
        <Globe size={17} />
        <h3>{t("language")}</h3>
      </div>
      <label className="language-field" htmlFor="settings-language">
        <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
          <SelectTrigger id="settings-language" className="source-trigger language-select-trigger" aria-label={t("language")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("english")}</SelectItem>
            <SelectItem value="zh">{t("chinese")}</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </section>
  );
}

function GithubSyncCard() {
  const { t } = useLanguage();
  const { github, updateGithub, mergeGithub, pushGithub, pullGithub, memories } = useMemoryStore();
  const privateCount = memories.filter((memory) => memory.isPrivate).length;
  const [repositoryUrl, setRepositoryUrl] = useState(() => github.owner && github.repo ? `https://${github.provider || "github"}.com/${github.owner}/${github.repo}` : "");
  const [connectionState, setConnectionState] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");

  function updateRepositoryUrl(value: string) {
    setRepositoryUrl(value);
    const parsed = parseRepositoryUrl(value);
    if (!parsed) {
      setConnectionState("idle");
      setConnectionMessage("");
      return;
    }
    updateGithub({ owner: parsed.owner, repo: parsed.repo, branch: github.branch || "main", path: github.path || "mory/memories.json" });
    setConnectionState("idle");
    setConnectionMessage("");
  }

  async function checkConnection() {
    const parsed = parseRepositoryUrl(repositoryUrl);
    if (!parsed || !github.token.trim()) {
      setConnectionState("error");
      setConnectionMessage("请填写正确的仓库地址和 Access token");
      return;
    }
    const provider = repositoryUrl.toLowerCase().includes("gitee.com") ? "gitee" : "github";
    const config = { ...github, provider, owner: parsed.owner, repo: parsed.repo, branch: github.branch || "main", path: github.path || "mory/memories.json" } as const;
    updateGithub(config);
    setConnectionState("checking");
    setConnectionMessage(t("checkingConnection"));
    try {
      const result = await checkGithubConnection(config);
      updateGithub({ branch: result.branch });
      setConnectionState("success");
      setConnectionMessage(`${t("connectionSuccess")}（${result.branch}）`);
    } catch (error) {
      setConnectionState("error");
      setConnectionMessage(error instanceof Error ? error.message : "连接失败");
    }
  }

  return (
    <section className="side-card sync-card">
      <div className="card-title">
        <Github size={17} />
        <h3>{t("githubSync")}</h3>
      </div>
      <div className="sync-layout">
      <div className="sync-column sync-column-connection">
      <div className="sync-connection-card">
      <div className="sync-config-section">
        <div className="sync-section-heading"><strong>{t("syncConnection")}</strong><span>{t("syncConnectionHint")}</span></div>
        <label className="language-field" htmlFor="sync-provider">
          <span>{t("provider")}</span>
          <Select value={github.provider} onValueChange={(value) => updateGithub({ provider: value as "" | "github" | "gitee" })}>
            <SelectTrigger id="sync-provider" aria-label={t("provider")}><SelectValue placeholder="请选择服务商" /></SelectTrigger>
            <SelectContent><SelectItem value="github">GitHub</SelectItem><SelectItem value="gitee">{t("gitee")}</SelectItem></SelectContent>
          </Select>
        </label>
        <label className="sync-field repository-url-field"><span>{t("repositoryUrl")}</span><Input value={repositoryUrl} onChange={(event) => updateRepositoryUrl(event.target.value)} aria-label={t("repositoryUrl")} placeholder="https://github.com/owner/repository" /></label>
        <div className="connection-access-row">
        <label className="sync-field"><span>Access token</span><Input className="token-input" type="password" value={github.token} onChange={(event) => updateGithub({ token: event.target.value })} aria-label="Access token" /></label>
        <label className="sync-field"><span>{t("deviceName")}</span><Input value={github.deviceName} onChange={(event) => updateGithub({ deviceName: event.target.value })} aria-label={t("deviceName")} /></label>
        </div>
        <Button className="check-connection-button" variant="outline" type="button" onClick={() => void checkConnection()} disabled={connectionState === "checking" || !parseRepositoryUrl(repositoryUrl) || !github.token.trim()}>
          <Cable size={16} />
          {connectionState === "checking" ? t("checkingConnection") : t("checkConnection")}
        </Button>
        {connectionMessage ? <div className={connectionState === "error" ? "sync-warning" : "sync-note"}>{connectionMessage}</div> : null}
      </div>
      </div>
      </div>
      <div className="sync-column sync-column-access">
      <label className="sync-auto-option">
        <Input type="checkbox" checked={github.autoSync} onChange={(event) => updateGithub({ autoSync: event.target.checked })} />
        <span><strong>{t("autoSync")}</strong><small>{t("autoSyncHint")}</small></span>
      </label>
      <div className={privateCount ? "sync-warning" : "sync-note"}>
        {privateCount ? `${privateCount} ${t("privateSyncWarning")}` : t("githubTokenNote")}
      </div>
      <div className="sync-actions">
        <Button className="primary-action" type="button" onClick={() => void mergeGithub()}>
          <Cloud size={16} />
          {t("mergePush")}
        </Button>
        <Button variant="outline" type="button" onClick={() => void pushGithub()} aria-label={t("pushRemote")} title={`${t("pushRemote")} (${memories.length})`}>
          <ArrowUpToLine size={16} />
        </Button>
        <Button variant="outline" type="button" onClick={() => void pullGithub()} aria-label={t("pullRemote")} title={t("pullRemote")}>
          <ArrowDownToLine size={16} />
        </Button>
      </div>
      <a className="sync-guide-button" href="https://my.feishu.cn/wiki/K4oGwSez3idFgYkhG83cEw2qnDd" target="_blank" rel="noreferrer">
        <BookOpenCheck size={16} />
        {t("setupGuide")}
      </a>
      </div>
      </div>
    </section>
  );
}

function ConnectorRail() {
  const { t } = useLanguage();
  const connectors = [
    { icon: <Archive size={17} />, name: t("manual"), state: t("active") },
    { icon: <Clipboard size={17} />, name: t("clipboard"), state: t("active") },
    { icon: <Globe size={17} />, name: t("browser"), state: t("activeLite") },
    { icon: <FileText size={17} />, name: t("file"), state: t("planned") },
    { icon: <Github size={17} />, name: t("github"), state: t("ready") },
  ];

  return (
    <section className="side-card">
      <div className="card-title">
        <Cable size={17} />
        <h3>{t("connectorsTitle")}</h3>
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
  const { t } = useLanguage();
  const { github, setKindFilter, update, remove } = useMemoryStore();
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
      className={["memory-card", selected ? "selected" : ""].filter(Boolean).join(" ")}
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
      <div className="memory-selection-cell">
        <Input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} aria-label={`Select ${memory.payload.title}`} />
      </div>
      <div className="memory-time">{relativeTime(memory.capturedAt, t)}</div>
      <div className="memory-entity">
        <strong>{github.deviceName || memory.origin?.deviceName || t("untitledMemory")}</strong>
        <span>{sourceLabel(memory.source, t)}</span>
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
          <Button variant="ghost" className="memory-title-button" type="button" onClick={onOpen}>{memory.isPrivate ? t("privateOnly") : memory.payload.title}</Button>
          <p>{memory.isPrivate ? t("privateOnly") : memoryPreview(memory) || memory.payload.content}</p>
        </>
      )}
      </div>
      <div className="memory-category">
        <Button variant="ghost" type="button" onClick={() => setKindFilter(memory.kind || "note")}>{recordLabel(memory.kind, t)}</Button>
        {memory.tags[0] ? <span>#{memory.tags[0]}</span> : null}
      </div>
        <div className="memory-life"><Badge>{t("active")}</Badge></div>
    </Card>
  );
}

function relativeTime(value: string, t: (key: TranslationKey) => string): string {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return String(minutes) + t("minutesAgo");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return String(hours) + t("hoursAgo");
  return String(Math.floor(hours / 24)) + t("daysAgo");
}

function MemoryDetailDrawer({
  memory,
  onClose,
}: {
  memory: MemoryObject;
  onClose: () => void;
}) {
  const { t } = useLanguage();
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
        <aside className="memory-drawer" role="dialog" aria-label={t("memoryDetail")} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">{t("memoryDetail")}</span>
            <h2>{memory.payload.title}</h2>
          </div>
          <Button variant="outline" type="button" onClick={onClose}>{t("close")}</Button>
        </header>
        <div className="drawer-grid">
          <label>
            {t("title")}
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            URL
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            {t("tags")}
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label>
            {t("memoryContent")}
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
        </div>
        <section className="drawer-meta">
          <span>{recordLabel(memory.kind, t)}</span>
          <span>{sourceLabel(memory.source, t)}</span>
          {memory.origin?.deviceName ? <span>{memory.origin.deviceName}</span> : null}
          <span>{new Date(memory.capturedAt).toLocaleString()}</span>
        </section>
        {Object.keys(memory.fields ?? {}).length ? (
          <section className="drawer-fields">
            <strong>{t("structuredFields")}</strong>
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
        <div className="drawer-actions">
          <Button variant="secondary" type="button" onClick={() => void update({ ...memory, isPrivate: !memory.isPrivate })}>
            <Shield size={15} />
            {memory.isPrivate ? t("makePublic") : t("markPrivate")}
          </Button>
          <Button type="button" onClick={() => void save()}>
            <Check size={15} />
            {t("save")}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function ContextPack({ memories, onClear }: { memories: MemoryObject[]; onClear: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"compact" | "full" | "archive">("compact");
  const remove = useMemoryStore((state) => state.remove);
  const visibleMemories = memories.filter((memory) => !memory.isPrivate);
  const privateCount = memories.length - visibleMemories.length;
  const text = buildContextPack(visibleMemories, mode);

  async function deleteSelected() {
    const confirmed = window.confirm(`Delete ${memories.length} selected memor${memories.length === 1 ? "y" : "ies"}? This cannot be undone.`);
    if (!confirmed) return;
    for (const memory of memories) {
      await remove(memory.id);
    }
    onClear();
  }

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
          <strong>{t("selectionPack")}</strong>
          <span>{visibleMemories.length} {t("included")}. {privateCount ? `${privateCount} ${t("privateExcluded")}. ` : ""}{t("portableBundle")}</span>
        </div>
      </div>
      <div className="context-actions">
        <Button variant="outline" type="button" onClick={onClear} title={t("clearPack")}>
          {t("clearSelection")}
        </Button>
        <InlineSelect
          value={mode}
          onChange={(value) => setMode(value as typeof mode)}
          options={[{ value: "compact", label: t("compact") }, { value: "full", label: t("full") }, { value: "archive", label: t("archive") }]}
        />
        <Button variant="destructive" type="button" onClick={() => void deleteSelected()} title={t("deleteSelected")}>
          <Trash2 size={15} />
          {t("delete")}
        </Button>
        <Button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
          title={t("copyBundle")}
        >
          {copied ? <Check size={15} /> : <Clipboard size={15} />}
          {copied ? t("copied") : t("copyPack")}
        </Button>
      </div>
    </section>
  );
}

function BookmarkImport() {
  const { t } = useLanguage();
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
    <label className="bookmark-import">
      <FileText size={16} />
      {t("importBookmarks")}
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
  const { t } = useLanguage();
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
    <label className="bookmark-import">
      <Upload size={16} />
      {t("importText")}
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
  const { t } = useLanguage();
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
      <Button variant="outline" className="export-action" type="button" onClick={exportJson} aria-label={t("exportMemories")} title={t("exportMemories")}>
      <ArrowDownToLine size={18} strokeWidth={2} />
    </Button>
  );
}

function JsonImport() {
  const { t } = useLanguage();
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
    <label className="bookmark-import">
      <Upload size={16} />
      {t("importJson")}
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
  const { t } = useLanguage();
  const setQuery = useMemoryStore((state) => state.setQuery);

  if (!tags.length) {
    return (
      <div className="tag-stack empty">
        <Link size={15} />
        <span>{t("tagsEmerge")}</span>
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

function StatusChip({ label, status }: { label: string; status: "local" | "syncing" | "synced" | "error" }) {
  return (
    <span className={`status-chip ${status}`}>
      {status === "syncing" ? <RefreshCw size={14} className="status-chip-spin" /> : null}
      {status === "synced" ? <CloudCheck size={14} /> : null}
      {status === "error" ? <CloudOff size={14} /> : null}
      {status === "local" ? <Archive size={14} /> : null}
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

function recordLabel(kind?: MemoryKind, translate?: (key: TranslationKey) => string): string {
  const found = recordModes.find((mode) => mode.kind === kind);
  if (!translate) return found?.label ?? "Note";
  const keys: Partial<Record<MemoryKind, TranslationKey>> = { note: "note", chat: "chat", bill: "bill", finance: "finance", task: "task", waiting: "waiting", bookmark: "bookmark", file: "file", decision: "decision", log: "log" };
  return translate(keys[kind ?? "note"] ?? "note");
}

function ThemePanel() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <section className="theme-panel" aria-labelledby="theme-panel-title">
      <div className="card-title"><Palette size={17} /><h3 id="theme-panel-title">{t("theme")}</h3></div>
      <div className="theme-options" role="radiogroup" aria-label={t("theme")}>
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-option ${theme === item.id ? "selected" : ""}`}
            onClick={() => setTheme(item.id)}
            role="radio"
            aria-checked={theme === item.id}
          >
            <span className="theme-swatches" aria-hidden="true">
              {item.swatches.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
            </span>
            <span className="theme-option-copy"><strong>{t(`theme${capitalize(item.id)}` as TranslationKey)}</strong><small>{t(`theme${capitalize(item.id)}Hint` as TranslationKey)}</small></span>
            <span className="theme-check" aria-hidden="true">{theme === item.id ? "✓" : ""}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function recordHint(kind?: MemoryKind): string {
  const found = recordModes.find((mode) => mode.kind === kind);
  return found?.hint ?? "Freeform memory";
}

function titlePlaceholder(kind: MemoryKind, t: (key: TranslationKey) => string): string {
  if (kind === "chat") {
    return t("conversationTitlePlaceholder");
  }

  if (kind === "bill") {
    return t("billTitlePlaceholder");
  }

  if (kind === "bookmark") {
    return t("bookmarkTitlePlaceholder");
  }

  if (kind === "finance") {
    return t("financeTitlePlaceholder");
  }

  if (kind === "task") {
    return t("taskTitlePlaceholder");
  }

  if (kind === "waiting") {
    return t("waitingTitlePlaceholder");
  }

  if (kind === "file") {
    return t("fileTitlePlaceholder");
  }

  if (kind === "decision") {
    return t("decisionTitlePlaceholder");
  }

  if (kind === "log") {
    return t("logTitlePlaceholder");
  }

  return t("noteTitlePlaceholder");
}

function contentPlaceholder(kind: MemoryKind, t: (key: TranslationKey) => string): string {
  if (kind === "chat") {
    return t("chatContentPlaceholder");
  }

  if (kind === "bill") {
    return t("billContentPlaceholder");
  }

  if (kind === "bookmark") {
    return t("bookmarkContentPlaceholder");
  }

  if (kind === "finance") {
    return t("financeContentPlaceholder");
  }

  if (kind === "task") {
    return t("taskContentPlaceholder");
  }

  if (kind === "waiting") {
    return t("waitingContentPlaceholder");
  }

  if (kind === "file") {
    return t("fileContentPlaceholder");
  }

  if (kind === "decision") {
    return t("decisionContentPlaceholder");
  }

  if (kind === "log") {
    return t("logContentPlaceholder");
  }

  return t("noteContentPlaceholder");
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
  const { t } = useLanguage();
  return (
    <div className={`notice ${tone}`} role={tone === "bad" ? "alert" : "status"} aria-live={tone === "bad" ? "assertive" : "polite"} aria-atomic="true">
      <span>{localizeMessage(text, t)}</span>
      {onRetry ? <Button variant="outline" type="button" onClick={onRetry}>{t("retry")}</Button> : null}
    </div>
  );
}

function localizeMessage(message: string, t: (key: TranslationKey) => string): string {
  const exact: Array<[string, TranslationKey]> = [
    ["Failed to load memories.", "loadFailed"], ["Failed to save memory.", "saveFailed"], ["Import failed.", "importFailed"],
    ["GitHub sync needs token, owner, repo, branch and path.", "githubConfig"], ["Pushing memories to GitHub...", "pushing"], ["Pulling memories from GitHub...", "pulling"], ["Merging local and GitHub memories...", "merging"],
    ["GitHub push failed.", "githubPushFailed"], ["GitHub pull failed.", "githubPullFailed"], ["GitHub merge failed.", "githubMergeFailed"],
  ];
  const match = exact.find(([source]) => message === source);
  if (match) return t(match[1]);
  const pushed = message.match(/^Pushed (\d+) memory objects to (GitHub|Gitee)\.$/);
  if (pushed) return t("pushedObjects").replace("{count}", pushed[1]).replace("{provider}", pushed[2]);
  const pulled = message.match(/^Pulled (\d+) memory objects from (GitHub|Gitee)\.$/);
  if (pulled) return t("pulledObjects").replace("{count}", pulled[1]).replace("{provider}", pulled[2]);
  const merged = message.match(/^Merged and pushed (\d+) memory objects\.$/);
  if (merged) return t("mergedObjects").replace("{count}", merged[1]);
  return message;
}

function isBackgroundSyncError(message: string): boolean {
  return /github|gitee|remote memory|memory file|sync|sha|does not match|409|401|403|404|SYNC_CONFLICT/i.test(message);
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
