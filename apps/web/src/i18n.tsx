import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "zh";

const translations = {
  en: {
    settings: "Settings", localRepository: "Local memory repository", storehouse: "Storehouse", recordTypes: "Record types",
    allMemories: "All memories", newMemory: "New memory", search: "Search memories...", today: "today", topics: "topics", pageSize: "Per page", previousPage: "Previous page", nextPage: "Next page", pageOf: "of",
    importMemories: "Import memories", repositorySummary: "Repository summary", repositoryActions: "Repository actions",
    captureTitle: "Capture something worth keeping", loading: "Loading your local repository...", reading: "Reading memories from IndexedDB.",
    clearSearch: "Clear search", time: "Time", entity: "Entity", memoryContent: "Memory content", category: "Category", lifecycle: "Lifecycle",
    repositorySettings: "Repository settings", manageSettings: "Manage connections and repository tools in one place.", settingsSections: "Settings sections",
    language: "Language", languageSwitch: "Language switch", english: "English", chinese: "中文", languageHint: "Choose the language for the interface.",
    allSources: "All sources", manual: "Manual", clipboard: "Clipboard", browser: "Browser", file: "File", chat: "Chat", github: "GitHub",
    note: "Note", finance: "Finance", bill: "Bill", task: "Task", waiting: "Waiting", bookmark: "Bookmark", decision: "Decision", log: "Log",
    save: "Save", saved: "Saved", capture: "Capture", close: "Close", retry: "Retry",
    noMatch: "No memories match this filter.", waitingRepo: "Your memory repository is waiting.",
    nothingMatched: "Nothing matched", tryAnother: "Try another search or clear the filter.", firstObject: "Capture the first object above and this area becomes your living memory feed.",
    anyTime: "Any time", last7: "Last 7 days", last30: "Last 30 days", allVisibility: "All visibility", publicOnly: "Public only", privateOnly: "Private only", newest: "Newest first", score: "Score first",
    health: "Health", topicsLabel: "Topics", connectors: "Connectors", languageSetting: "Interface language", theme: "Appearance", themeHint: "Choose a visual style for your workspace.", themeDefault: "Default", themeDefaultHint: "Calm repository green", themeMidnight: "Midnight", themeMidnightHint: "Focused dark workspace", themeOcean: "Ocean", themeOceanHint: "Cool blue clarity", themeSunset: "Sunset", themeSunsetHint: "Warm amber energy", themeForest: "Forest", themeForestHint: "Deep natural focus", themeLavender: "Lavender", themeLavenderHint: "Soft creative calm", themeGraphite: "Graphite", themeGraphiteHint: "Neutral dark precision", themeRose: "Rose", themeRoseHint: "Warm editorial blush", themeTerminal: "Terminal", themeTerminalHint: "High-contrast green glow", themeSand: "Sand", themeSandHint: "Quiet paper workspace", themeCobalt: "Cobalt", themeCobaltHint: "Electric blue focus", themePlum: "Plum", themePlumHint: "Rich evening editorial", themeMint: "Mint", themeMintHint: "Fresh lightweight clarity", themeCopper: "Copper", themeCopperHint: "Crafted warm contrast", themeMono: "Mono", themeMonoHint: "Quiet black and white",
    selectAll: "Select all visible memories", memoryDetail: "Memory details", structuredFields: "Structured Fields", preview: "Preview", selectionPack: "Selection Pack",
    addToPack: "Add to Pack", removeFromPack: "Remove from Pack", makePublic: "Make Public", markPrivate: "Mark Private", copyPack: "Copy pack", copied: "Copied",
    repositoryHealth: "Repository Health", repositoryActive: "Repository active", projectsTopics: "Projects & Topics", topicHint: "Capture or import more memories and Mory will cluster them by tag.",
    githubSync: "Memory Sync", setupFlow: "Setup guide", setupGuide: "Setup guide", mergePush: "Merge & Push", push: "Push", pull: "Pull", backup: "Commit SQLite backup", connectorsTitle: "Connectors", provider: "Provider", gitee: "Gitee", autoSync: "Auto backup", deviceName: "Device name", autoSyncHint: "Automatically merge and back up after changes.", syncConnection: "Repository connection", syncConnectionHint: "Choose where your memories will be stored.", repositoryUrl: "Repository URL", checkConnection: "Check connection", checkingConnection: "Checking...", connectionSuccess: "Connection successful", syncLocal: "Local", syncSyncing: "Syncing", syncSynced: "Synced", syncError: "Sync needs attention", untitledMemory: "Untitled memory", syncAccess: "Access & device", syncAccessHint: "Use the same repository on multiple devices.",
    import: "Import", export: "Export", paste: "Paste", title: "Title", content: "Content", tags: "Tags", source: "Source", type: "Type", saveChanges: "Save changes",
    delete: "Delete", active: "Active", noDueDate: "no due date", unknownMerchant: "Unknown merchant", conversationRecord: "Conversation record", webReference: "Web reference", fileReference: "File reference",
    clear: "Clear", clearSelection: "Clear selection", compact: "Compact", full: "Full", archive: "Archive", included: "included", privateExcluded: "private excluded", portableBundle: "Copy selected memories as a portable text bundle.",
    githubTokenNote: "The token is stored on this device so automatic sync can continue after refresh.", pushRemote: "Push remote repository", pullRemote: "Pull remote repository",
    clipboardLoaded: "Clipboard loaded.", clipboardPermission: "Allow clipboard permission, then try again.",
    tagsPlaceholder: "tags: product, mory, research", amountPlaceholder: "Amount, e.g. 68.90", merchantPlaceholder: "Merchant or payee", categoryPlaceholder: "Category, e.g. food, infra, travel", conversationPlaceholder: "Conversation with / channel / room", currencyPlaceholder: "Currency", accountPlaceholder: "Account / asset / wallet", typePlaceholder: "Type: income, asset, debt, transfer", ownerProject: "Owner / project", waitingPlaceholder: "Waiting for person / event / reply", fileNamePlaceholder: "File name", pathPlaceholder: "Path, drive URL, or storage location", ownerTeamProject: "Owner / team / project", moodPlaceholder: "Mood, state, metric, or location",
    todo: "Todo", doing: "Doing", done: "Done", blocked: "Blocked", followUp: "Follow-up", received: "Received", proposed: "Proposed", decided: "Decided", reversed: "Reversed",
    tagsEmerge: "Tags will emerge as you capture.", importBookmarks: "Import bookmarks", importText: "Import text", importJson: "Import JSON", exportMemories: "Export memories", rawMemory: "Raw memory", openMemory: "Open memory", selectMemory: "Select memory",
    conversationTitlePlaceholder: "Conversation title, or leave it for Mory to infer", billTitlePlaceholder: "Bill title, project, or subscription name", bookmarkTitlePlaceholder: "Page title, article name, or reference label", financeTitlePlaceholder: "Financial record title, account, asset, or transaction", taskTitlePlaceholder: "Task title or action item", waitingTitlePlaceholder: "Waiting item or follow-up title", fileTitlePlaceholder: "Document title or file reference", decisionTitlePlaceholder: "Decision title", logTitlePlaceholder: "Log title, habit, day, project, or event", noteTitlePlaceholder: "Give this memory a name, or leave it for Mory to infer",
    chatContentPlaceholder: "Write messages, decisions, or conversation fragments. Example:\nMe: ...\nPartner: ...", billContentPlaceholder: "Optional bill note: why it happened, project relation, receipt detail, reimbursement status...", bookmarkContentPlaceholder: "Optional page note: why this link matters, what to remember, related project...", financeContentPlaceholder: "Optional finance note: why it changed, source, account detail, tax/reimbursement context...", taskContentPlaceholder: "Describe the task, acceptance criteria, blockers, or next step...", waitingContentPlaceholder: "Record what you are waiting for, what happened, and when to follow up...", fileContentPlaceholder: "Describe what this file contains, where it belongs, and why it matters...", decisionContentPlaceholder: "Record the decision, options considered, reason, owner, and consequences...", logContentPlaceholder: "Write what happened, metrics, state, observation, or timeline notes...", noteContentPlaceholder: "Paste a decision, page note, meeting context, link, or fragment worth remembering.",
    justNow: "just now", minutesAgo: "m ago", hoursAgo: "h ago", daysAgo: "d ago", clearPack: "Remove all memories from the current selection pack", deleteSelected: "Delete all selected memories", copyBundle: "Copy selected memories as a structured text bundle",
    objects: "Objects", objectCount: "objects", tagsCount: "Tags", planned: "Planned", ready: "Ready", activeLite: "Active-lite", privateSyncWarning: "private memories are included in sync/export unless you remove them first.", sqliteBackingUp: "Backing up SQLite...", sqliteCommitted: "SQLite + JSON committed", sqliteBackupFailed: "SQLite backup failed.",
    loadFailed: "Failed to load memories.", saveFailed: "Failed to save memory.", importFailed: "Import failed.", githubConfig: "GitHub sync needs token, owner, repo, branch and path.", pushing: "Pushing memories to GitHub...", pulling: "Pulling memories from the remote repository...", merging: "Merging local and remote memories...", pushedObjects: "Pushed {count} memory objects to {provider}.", pulledObjects: "Pulled {count} memory objects from {provider}.", mergedObjects: "Merged and pushed {count} memory objects.", githubPushFailed: "GitHub push failed.", githubPullFailed: "GitHub pull failed.", githubMergeFailed: "GitHub merge failed.",
  },
  zh: {
    settings: "设置", localRepository: "本地记忆仓库", storehouse: "记忆库", recordTypes: "记录类型",
    allMemories: "全部记忆", newMemory: "新建记忆", search: "搜索记忆...", today: "今天", topics: "主题", pageSize: "每页", previousPage: "上一页", nextPage: "下一页", pageOf: "/",
    importMemories: "导入记忆", repositorySummary: "仓库摘要", repositoryActions: "仓库操作",
    captureTitle: "记录值得保留的内容", loading: "正在加载本地仓库...", reading: "正在从 IndexedDB 读取记忆。",
    clearSearch: "清除搜索", time: "时间", entity: "实体", memoryContent: "记忆内容", category: "分类", lifecycle: "生命周期",
    repositorySettings: "仓库设置", manageSettings: "在这里管理连接和仓库工具。", settingsSections: "设置分区",
    language: "语言", languageSwitch: "语言切换", english: "English", chinese: "中文", languageHint: "选择界面显示语言。",
    allSources: "全部来源", manual: "手动", clipboard: "剪贴板", browser: "浏览器", file: "文件", chat: "对话", github: "GitHub",
    note: "笔记", finance: "财务", bill: "账单", task: "任务", waiting: "等待中", bookmark: "书签", decision: "决策", log: "日志",
    save: "保存", saved: "已保存", capture: "记录", close: "关闭", retry: "重试",
    noMatch: "没有记忆符合当前筛选条件。", waitingRepo: "你的记忆仓库正在等待内容。",
    nothingMatched: "没有找到", tryAnother: "试试其他搜索词，或清除筛选条件。", firstObject: "记录上方的第一条内容，这里就会成为你的记忆流。",
    anyTime: "不限时间", last7: "最近 7 天", last30: "最近 30 天", allVisibility: "全部可见性", publicOnly: "仅公开", privateOnly: "仅私密", newest: "最新优先", score: "评分优先",
    health: "健康状态", topicsLabel: "主题", connectors: "连接器", languageSetting: "界面语言", theme: "外观主题", themeHint: "选择适合你的工作区视觉风格。", themeDefault: "默认主题", themeDefaultHint: "沉静的仓库绿", themeMidnight: "午夜", themeMidnightHint: "专注的深色工作区", themeOcean: "海洋", themeOceanHint: "清爽的蓝色界面", themeSunset: "日落", themeSunsetHint: "温暖的琥珀色能量", themeForest: "森林", themeForestHint: "深沉的自然专注感", themeLavender: "薰衣草", themeLavenderHint: "柔和的创意氛围", themeGraphite: "石墨", themeGraphiteHint: "中性的深色精确感", themeRose: "玫瑰", themeRoseHint: "温暖的编辑感腮红", themeTerminal: "终端", themeTerminalHint: "高对比的绿色荧光", themeSand: "砂纸", themeSandHint: "安静的纸张工作区", themeCobalt: "钴蓝", themeCobaltHint: "电光蓝的专注感", themePlum: "梅紫", themePlumHint: "浓郁的夜间编辑感", themeMint: "薄荷", themeMintHint: "清新的轻盈明亮感", themeCopper: "铜色", themeCopperHint: "手作感的温暖对比", themeMono: "黑白", themeMonoHint: "安静的黑白工作区",
    selectAll: "选择当前可见的全部记忆", memoryDetail: "记忆详情", structuredFields: "结构化字段", preview: "预览", selectionPack: "选择包",
    addToPack: "加入选择包", removeFromPack: "移出选择包", makePublic: "设为公开", markPrivate: "标记为私密", copyPack: "复制选择包", copied: "已复制",
    repositoryHealth: "仓库健康状态", repositoryActive: "仓库运行正常", projectsTopics: "项目与主题", topicHint: "继续记录或导入更多记忆，Mory 会按标签聚合它们。",
    githubSync: "记忆同步", setupFlow: "配置流程", setupGuide: "配置教程", mergePush: "合并并推送", push: "推送", pull: "拉取", backup: "提交 SQLite 备份", connectorsTitle: "连接器", provider: "服务商", gitee: "Gitee", autoSync: "自动备份", deviceName: "设备名称", autoSyncHint: "记忆发生变化后自动合并并备份。", syncConnection: "连接仓库", syncConnectionHint: "选择用于保存记忆的远程仓库。", repositoryUrl: "仓库地址", checkConnection: "检测连接", checkingConnection: "检测中…", connectionSuccess: "连接成功", syncLocal: "仅本地", syncSyncing: "同步中", syncSynced: "已同步", syncError: "同步需处理", untitledMemory: "未命名记忆", syncAccess: "访问与设备", syncAccessHint: "同一个仓库可以在多台设备上使用。",
    import: "导入", export: "导出", paste: "粘贴", title: "标题", content: "内容", tags: "标签", source: "来源", type: "类型", saveChanges: "保存修改",
    delete: "删除", active: "活跃", noDueDate: "无截止日期", unknownMerchant: "未知商户", conversationRecord: "对话记录", webReference: "网页引用", fileReference: "文件引用",
    clear: "清除", clearSelection: "清除选择", compact: "精简", full: "完整", archive: "归档", included: "条已包含", privateExcluded: "条私密记忆已排除", portableBundle: "将选中的记忆复制为可携带的文本包。",
    githubTokenNote: "Token 会保存在本设备，用于刷新后继续自动同步。", pushRemote: "推送到远程仓库", pullRemote: "从远程仓库拉取",
    clipboardLoaded: "剪贴板内容已加载。", clipboardPermission: "请允许剪贴板权限后重试。",
    tagsPlaceholder: "标签：产品、Mory、研究", amountPlaceholder: "金额，例如 68.90", merchantPlaceholder: "商户或收款方", categoryPlaceholder: "分类，例如餐饮、基础设施、出行", conversationPlaceholder: "对话对象 / 频道 / 房间", currencyPlaceholder: "货币", accountPlaceholder: "账户 / 资产 / 钱包", typePlaceholder: "类型：收入、资产、负债、转账", ownerProject: "负责人 / 项目", waitingPlaceholder: "等待的人 / 事件 / 回复", fileNamePlaceholder: "文件名", pathPlaceholder: "路径、云盘 URL 或存储位置", ownerTeamProject: "负责人 / 团队 / 项目", moodPlaceholder: "情绪、状态、指标或地点",
    todo: "待办", doing: "进行中", done: "已完成", blocked: "已阻塞", followUp: "待跟进", received: "已收到", proposed: "提议中", decided: "已决定", reversed: "已撤回",
    tagsEmerge: "记录更多内容后，标签会逐渐出现。", importBookmarks: "导入书签", importText: "导入文本", importJson: "导入 JSON", exportMemories: "导出记忆", rawMemory: "原始记忆", openMemory: "打开记忆", selectMemory: "选择记忆",
    conversationTitlePlaceholder: "对话标题，也可以留空让 Mory 自动推断", billTitlePlaceholder: "账单标题、项目或订阅名称", bookmarkTitlePlaceholder: "页面标题、文章名称或引用标签", financeTitlePlaceholder: "财务记录标题、账户、资产或交易", taskTitlePlaceholder: "任务标题或行动项", waitingTitlePlaceholder: "等待事项或跟进标题", fileTitlePlaceholder: "文档标题或文件引用", decisionTitlePlaceholder: "决策标题", logTitlePlaceholder: "日志标题、习惯、日期、项目或事件", noteTitlePlaceholder: "给这条记忆起个名字，也可以留空让 Mory 自动推断",
    chatContentPlaceholder: "记录消息、决定或对话片段。例如：\n我：……\n对方：……", billContentPlaceholder: "可选的账单备注：发生原因、项目关联、收据详情、报销状态……", bookmarkContentPlaceholder: "可选的页面备注：链接为何重要、需要记住什么、关联项目……", financeContentPlaceholder: "可选的财务备注：变动原因、来源、账户详情、税务或报销背景……", taskContentPlaceholder: "描述任务、验收标准、阻塞原因或下一步……", waitingContentPlaceholder: "记录正在等待什么、发生了什么，以及何时跟进……", fileContentPlaceholder: "描述文件内容、归属位置以及它为何重要……", decisionContentPlaceholder: "记录决定、考虑过的选项、原因、负责人和后果……", logContentPlaceholder: "记录发生了什么、指标、状态、观察或时间线……", noteContentPlaceholder: "粘贴值得记住的决定、页面备注、会议上下文、链接或片段。",
    justNow: "刚刚", minutesAgo: "分钟前", hoursAgo: "小时前", daysAgo: "天前", clearPack: "移除当前选择包中的全部记忆", deleteSelected: "删除所有选中的记忆", copyBundle: "复制选中的记忆文本包",
    objects: "对象", objectCount: "个对象", tagsCount: "标签", planned: "计划中", ready: "已就绪", activeLite: "轻量活跃", privateSyncWarning: "条私密记忆会被包含在同步或导出中，如不需要请先移除。", sqliteBackingUp: "正在备份 SQLite……", sqliteCommitted: "SQLite + JSON 已提交", sqliteBackupFailed: "SQLite 备份失败。",
    loadFailed: "加载记忆失败。", saveFailed: "保存记忆失败。", importFailed: "导入失败。", githubConfig: "GitHub 同步需要填写 token、所有者、仓库、分支和路径。", pushing: "正在推送记忆到 GitHub……", pulling: "正在从远程仓库拉取记忆……", merging: "正在合并本地与远程记忆……", pushedObjects: "已推送 {count} 条记忆到 {provider}。", pulledObjects: "已从 {provider} 拉取 {count} 条记忆。", mergedObjects: "已合并并推送 {count} 条记忆。", githubPushFailed: "GitHub 推送失败。", githubPullFailed: "GitHub 拉取失败。", githubMergeFailed: "GitHub 合并失败。",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage);
  const setLanguage = (next: Language) => {
    try { localStorage.setItem("mory.language", next); } catch { /* preference storage is optional */ }
    setLanguageState(next);
  };
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem("mory.language");
    if (saved === "zh" || saved === "en") return saved;

    // Respect the browser's language only for the first visit. Once the user
    // changes the setting, the explicit preference above remains authoritative.
    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
    return browserLanguages.some((language) => /^zh(?:-|$)/i.test(language)) ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
