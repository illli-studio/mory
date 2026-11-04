window.__ModuleLoader__.load({
  id: '@illli-studio/dsh-mory',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const css = __MORY_STYLES__;
    const logo = __MORY_LOGO__;
    const themes = __MORY_THEMES__;
    const kinds = ['note', 'chat', 'bill', 'finance', 'task', 'waiting', 'bookmark', 'file', 'decision', 'log'];
    const en = {
      name: 'Mory', repository: 'Local Memory Repository', recordTypes: 'Record types', all: 'All memories',
      add: 'New memory', refresh: 'Refresh', loading: 'Loading memories…', reading: 'Reading your local repository.',
      empty: 'Your memory repository starts here', emptyHint: 'Save an idea, a useful detail, or a decision you want to keep.',
      noMatch: 'No matching memories', clear: 'Clear filters', search: 'Search your memories…', allSources: 'All sources',
      allTime: 'Any time', today: 'Today', week: 'This week', month: 'This month', topics: 'Topics', objects: 'memories',
      allPrivacy: 'All visibility', public: 'Public', private: 'Private', tag: 'Filter by tag', project: 'Project ID',
      filters: 'Filters', time: 'Time', entity: 'Source', content: 'Memory content', category: 'Category', lifecycle: 'Lifecycle',
      active: 'Active', localDevice: 'Local device', local: 'Local', connected: 'Connected', offline: 'Not connected',
      title: 'Title', tags: 'Tags (comma separated)', kind: 'Kind', save: 'Save memory', cancel: 'Cancel', close: 'Close',
      edit: 'Edit', remove: 'Delete', detail: 'Memory details', revision: 'Revision', markPrivate: 'Mark as private',
      privateHint: 'A display flag; connected AI tools can still read this memory.',
      confirm: 'Delete this memory?', confirmHint: 'It will disappear from active memories. Mory keeps a deletion record.',
      confirmDelete: 'Delete memory', saved: 'Memory saved.', deleted: 'Memory deleted.', unsaved: 'Save or cancel your changes before leaving.',
      conflict: 'This memory changed elsewhere. Your draft is preserved. Cancel and reopen it to read the latest version.',
      setup: 'Connect your local Mory', setupHint: 'Run these commands on the computer hosting DSH, then refresh.',
      shared: 'The same memories, here and in your local Mory web console.', back: 'Back to conversation',
      theme: 'Switch between the original light and midnight themes', failed: 'Mory request failed.',
      previous: 'Previous page', next: 'Next page', pageSize: 'Per page', of: 'of', page: 'Page',
      tooLarge: 'This record exceeds the editor limit. Please edit it in the Mory web console.',
      catalogLimit: 'This project contains more than 10000 memories. Enter a project ID to narrow the repository.',
      searchLimit: 'Showing up to 50 ranked search results.',
      note: 'Note', chat: 'Chat', bill: 'Bill', finance: 'Finance', task: 'Task', waiting: 'Waiting', bookmark: 'Bookmark', file: 'File', decision: 'Decision', log: 'Log',
      manual: 'Manual', dsh: 'DSH', browser: 'Browser', clipboard: 'Clipboard', github: 'GitHub', gitee: 'Gitee',
    };
    const zh = {
      name: 'Mory', repository: '本地记忆仓库', recordTypes: '记录类型', all: '全部记忆',
      add: '新增记忆', refresh: '刷新', loading: '正在加载记忆…', reading: '正在读取你的本地记忆仓库。',
      empty: '从这里开始，留下你的记忆', emptyHint: '记录一个灵感、一段有用的信息，或一个值得保留的决定。',
      noMatch: '没有找到匹配的记忆', clear: '清除筛选', search: '搜索你的记忆…', allSources: '全部来源',
      allTime: '全部时间', today: '今天', week: '本周', month: '本月', topics: '个主题', objects: '条记忆',
      allPrivacy: '全部可见性', public: '公开', private: '私密', tag: '筛选标签', project: '项目 ID',
      filters: '筛选', time: '时间', entity: '来源', content: '记忆内容', category: '分类', lifecycle: '生命周期',
      active: '活跃', localDevice: '本地设备', local: '本地', connected: '已连接', offline: '未连接',
      title: '标题', tags: '标签（逗号分隔）', kind: '类型', save: '保存记忆', cancel: '取消', close: '关闭',
      edit: '编辑', remove: '删除', detail: '记忆详情', revision: '版本', markPrivate: '标记为私密',
      privateHint: '这是展示标记；已连接的 AI 工具仍可读取这条记忆。',
      confirm: '删除这条记忆？', confirmHint: '它将从有效记忆中移除，Mory 会保留删除记录。',
      confirmDelete: '确认删除', saved: '记忆已保存。', deleted: '记忆已删除。', unsaved: '请先保存或取消当前修改。',
      conflict: '这条记忆已在其他位置修改。草稿已保留，请取消后重新打开以读取最新版本。',
      setup: '连接你的本地 Mory', setupHint: '在运行 DSH 的电脑上执行以下命令，然后刷新。',
      shared: '与本地 Mory 网页版，共用同一个记忆仓库。', back: '返回对话',
      theme: '切换原站的浅色与午夜主题', failed: 'Mory 请求失败。',
      previous: '上一页', next: '下一页', pageSize: '每页', of: '/', page: '页',
      tooLarge: '这条记忆超过编辑器限制，请到 Mory 网页版编辑。',
      catalogLimit: '此项目超过 10000 条记忆，请输入项目 ID 缩小仓库范围。',
      searchLimit: '最多显示 50 条按相关度排序的搜索结果。',
      note: '笔记', chat: '聊天', bill: '账单', finance: '财务', task: '任务', waiting: '等待', bookmark: '书签', file: '文件', decision: '决定', log: '日志',
      manual: '手动', dsh: 'DSH', browser: '浏览器', clipboard: '剪贴板', github: 'GitHub', gitee: 'Gitee',
    };
    Object.assign(en, {
      settings: 'Settings', settingsHint: 'Manage your repository, connections and preferences.', returnMemories: 'Back to memories',
      syncSettings: 'Memory Sync', languageSettings: 'Language', themeSettings: 'Appearance', healthSettings: 'Health', connectionSettings: 'Mory connection',
      languageHint: 'Choose a language for Mory. This does not change the rest of DSH.', followDSH: 'Follow DSH', appearanceHint: 'The original Mory themes, applied only to this panel.',
      connectionHint: 'Connect to Mory on the DSH host, or to your own HTTPS service.', apiUrl: 'API address', accessToken: 'Access token', storedToken: 'Token saved — leave blank to keep it', tokenOptional: 'Leave blank to use the local Mory configuration', saveSettings: 'Save settings', settingsSaved: 'Settings saved.', checkConnection: 'Check connection', checking: 'Checking…', connectionOK: 'Connection successful', autoDetect: 'Use local auto-detection',
      connectionPrecedence: 'Advanced DSH plugin configuration and environment variables take priority over these preferences.',
      provider: 'Provider', repositoryUrl: 'Repository URL', branch: 'Branch', filePath: 'Snapshot path', deviceName: 'Device name',
      syncHint: 'Use a private GitHub or Gitee repository to keep memories available across devices.', syncPrivacy: 'Sync includes private memories and deletion records. Use a private repository. Tokens stay on the DSH host and are never returned to this page.',
      autoSync: 'Automatic backup', autoSyncHint: 'Merge and back up after future changes made through this plugin or its agent tool. Saving settings does not upload memories.',
      mergePush: 'Merge & push', pushRemote: 'Push', pullRemote: 'Pull', syncing: 'Sync in progress…', syncDone: 'Sync completed.', lastSync: 'Last sync', neverSynced: 'No sync has run yet',
      healthHint: 'Check the actual Mory service connection and repository status.', serviceAddress: 'Service address', totalMemories: 'Total memories', connectionStatus: 'Connection status',
      settingsConflict: 'Settings changed elsewhere. Reload settings before saving again.', reloadSettings: 'Reload settings', unsavedSettings: 'Save your connection details before checking or syncing.',
    });
    Object.assign(zh, {
      settings: '设置', settingsHint: '管理记忆仓库、服务连接和界面偏好。', returnMemories: '返回记忆库',
      syncSettings: '记忆同步', languageSettings: '语言', themeSettings: '外观主题', healthSettings: '健康状态', connectionSettings: 'Mory 连接',
      languageHint: '选择 Mory 的界面语言，不会改变 DSH 其他页面的语言。', followDSH: '跟随 DSH', appearanceHint: '沿用 Mory 原站的主题，仅应用于当前插件。',
      connectionHint: '连接 DSH 所在电脑上的 Mory，或你自己的 HTTPS 服务。', apiUrl: 'API 地址', accessToken: '访问令牌', storedToken: '已保存令牌，留空保持不变', tokenOptional: '留空使用本地 Mory 配置', saveSettings: '保存设置', settingsSaved: '设置已保存。', checkConnection: '检测连接', checking: '检测中…', connectionOK: '连接成功', autoDetect: '自动检测本地服务',
      connectionPrecedence: 'DSH 插件高级配置和环境变量的优先级高于这里保存的偏好。',
      provider: '服务商', repositoryUrl: '仓库地址', branch: '分支', filePath: '快照路径', deviceName: '设备名称',
      syncHint: '使用 GitHub 或 Gitee 私有仓库，在多台设备间保留记忆。', syncPrivacy: '同步会包含私密记忆和删除记录，请使用私有仓库。令牌保存在 DSH 后端，读取设置时不会返回到页面。',
      autoSync: '自动备份', autoSyncHint: '之后通过此插件或 AI 工具修改记忆时，自动合并备份。保存设置本身不会上传记忆。',
      mergePush: '合并并推送', pushRemote: '推送', pullRemote: '拉取', syncing: '正在同步…', syncDone: '同步完成。', lastSync: '最近同步', neverSynced: '尚未执行同步',
      healthHint: '检测真实的 Mory 服务连接与记忆仓库状态。', serviceAddress: '服务地址', totalMemories: '记忆总数', connectionStatus: '连接状态',
      settingsConflict: '设置已在其他位置修改，请重新读取后再保存。', reloadSettings: '重新读取设置', unsavedSettings: '请先保存连接信息，再检测或同步。',
    });
    for (const item of themes) {
      en[`themeName.${item.id}`] = item.en.name; en[`themeHint.${item.id}`] = item.en.hint;
      zh[`themeName.${item.id}`] = item.zh.name; zh[`themeHint.${item.id}`] = item.zh.hint;
    }
    const adaptation = `
@scope (.mory-app) {
  :scope { min-height:0!important; height:100%; overflow:auto!important; color:var(--text); background:var(--bg); font-size:14px; line-height:1.5; }
  *,*::before,*::after {box-sizing:border-box}
  h1,h2,h3,p {margin:0} button,input,select,textarea {font:inherit} button {cursor:pointer} button:disabled {opacity:.45;cursor:default}
  [data-slot=button] {display:inline-flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0;min-height:40px;border:1px solid transparent;border-radius:var(--radius-ui);padding:8px 14px;font-size:13px;font-weight:500;white-space:nowrap;background:hsl(var(--primary));color:hsl(var(--primary-foreground));transition:background .15s,color .15s,border-color .15s}
  [data-slot=button][data-variant=ghost] {background:transparent;color:var(--text)}
  [data-slot=button][data-variant=outline] {background:var(--surface);color:var(--text);border-color:var(--border)}
  [data-slot=button][data-variant=secondary] {background:var(--surface-muted);color:var(--text);border-color:var(--border-soft)}
  [data-slot=button][data-variant=destructive] {background:var(--danger);color:var(--surface)}
  [data-slot=button]:hover:not(:disabled) {filter:brightness(.96)}
  :focus-visible {outline:2px solid var(--accent);outline-offset:3px}
  [data-slot=input]:not([type=checkbox]),[data-slot=textarea],select {width:100%;min-width:0;min-height:42px;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface);color:var(--text);padding:10px 12px;font-size:13px}
  input::placeholder,textarea::placeholder {color:var(--muted)}
  .product-shell {min-height:100%;padding:20px 24px 32px}
  .product-header {width:100%;max-width:1560px;min-height:58px;margin:0 auto 18px;padding:0 4px;gap:16px}
  .product-header .brand-lockup {opacity:1!important;pointer-events:auto!important;min-width:0}
  .product-header .brand-lockup strong {font-size:19px;font-weight:700}
  .product-header .brand-lockup span {font-size:12px;color:var(--muted)}
  .product-header .brand-glyph.logo-mark {height:44px;width:44px;flex-shrink:0}
  .mory-original-logo {width:44px;height:44px;display:block}
  .header-actions {gap:8px;max-width:none}
  .dsh-icon-button {width:38px!important;height:38px!important;min-height:38px!important;padding:0!important;border-radius:12px!important}
  .status-chip {min-width:0;height:34px;font-weight:500;font-size:12px}
  .dsh-status-dot {width:6px;height:6px;flex:none;border-radius:50%;background:currentColor}
  .workspace-layout {display:grid!important;grid-template-columns:184px minmax(0,1fr);gap:18px;width:100%;max-width:1560px}
  .workspace-nav {display:block!important;top:16px;border-radius:20px;padding:14px 10px;box-shadow:none}
  .nav-section-label {font-size:11px;letter-spacing:.05em;margin:8px 10px 14px;color:var(--muted)}
  .workspace-nav .record-nav-list {display:flex;flex-direction:column}
  .workspace-nav .nav-section-label {display:block}
  .record-nav-list button {display:flex;width:100%;min-height:40px;padding:8px 10px;gap:10px;justify-content:flex-start;font-weight:500}
  .record-nav-list button span {flex:1;text-align:left}
  .record-nav-list button strong {font-size:11px;min-width:22px;text-align:center;font-weight:500;opacity:.7}
  .record-nav-list button.active {font-weight:600}
  .sidebar-footer {font-size:11px;line-height:1.7;color:var(--muted);padding:14px 8px 2px}
  .workspace-main {min-width:0}.feed-section {min-height:520px;border:1px solid var(--border);border-radius:20px;padding:20px;box-shadow:none;background:var(--surface)}
  .section-heading {display:flex;gap:12px;align-items:center;margin:0 0 20px;flex-wrap:wrap}
  .section-heading .capture-cta {margin:0;min-height:42px;box-shadow:none;border-radius:12px}
  .feed-summary {margin-left:auto;font-size:12px;gap:14px;color:var(--muted);display:flex;align-items:center}
  .feed-summary strong {font-size:14px;color:var(--text);font-weight:600}
  .dsh-controls {display:grid;grid-template-columns:minmax(150px,1fr) 130px;gap:10px;margin-bottom:12px}
  .dsh-controls .search-input {display:flex;align-items:center;min-width:0;gap:10px;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:0 12px;box-shadow:0 2px 6px color-mix(in srgb,var(--text) 3%,transparent)}
  .dsh-controls .search-input [data-slot=input] {height:42px;min-height:42px;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;outline:0;border-radius:0!important}
  .dsh-controls .search-input:focus-within {outline:2px solid var(--accent);outline-offset:2px}
  .dsh-filter-row {display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
  .dsh-filter-row select {width:auto;flex:1;min-width:110px;max-width:180px;min-height:36px;padding:7px 10px;border-radius:10px;font-size:12px}
  .dsh-filter-row input {flex:1;min-width:100px;max-width:180px;min-height:36px!important;height:36px;padding:7px 10px!important;border-radius:10px!important;font-size:12px}
  .dsh-filter-row .dsh-filter-label {display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-right:2px}
  .memory-list-header,.memory-card {grid-template-columns:70px 100px minmax(120px,1fr) 80px 60px!important;gap:12px;padding:12px 10px;min-width:0}
  .memory-list-header {display:grid;font-weight:500;font-size:11px;letter-spacing:0;text-transform:none;min-height:40px}
  .memory-card {min-height:82px;cursor:pointer;outline-offset:-2px}
  .memory-title-button {display:block!important;width:100%;font-size:13px;font-weight:600;min-height:0!important;padding:0!important;white-space:nowrap;text-align:left;justify-content:flex-start;border:0!important;border-radius:0!important}
  .memory-content-cell p {margin-top:5px;font-size:12px;font-weight:400;line-height:1.5}
  .memory-time {font-size:11px;line-height:1.6}.memory-entity strong {font-size:12px;font-weight:500}.memory-entity span {font-size:11px}
  .memory-category .dsh-kind {padding:4px 8px!important;min-height:0!important;font-size:11px!important;font-weight:500!important;border-radius:8px!important;max-width:100%;background:var(--surface-muted)!important}
  .memory-category>span {font-size:10px}.memory-life [data-slot=badge] {display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:500;border-radius:6px;padding:4px 7px;white-space:nowrap}
  .empty-feed {min-height:330px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;padding:48px 24px;text-align:center;background:transparent;border:0;border-radius:0}
  .empty-feed svg {color:var(--accent);opacity:.65}.empty-feed h3 {font-size:17px;font-weight:600;color:var(--text)}.empty-feed p {font-size:13px;line-height:1.8;color:var(--muted);max-width:340px}
  .dsh-notice {display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--border-soft);border-radius:12px;font-size:12px;line-height:1.7;margin-bottom:14px;background:var(--surface-muted);overflow-wrap:anywhere}
  .dsh-notice.error {color:var(--danger)}.dsh-notice.success {color:var(--accent)}
  .dsh-setup {padding:24px;border:1px solid var(--border);border-radius:16px;margin-bottom:16px}.dsh-setup h2 {font-size:18px;margin-bottom:8px}.dsh-setup p {font-size:13px;color:var(--muted);line-height:1.7}.dsh-setup pre {padding:16px;border-radius:12px;background:var(--surface-muted);font-size:12px;line-height:1.8;white-space:pre-wrap}
  .memory-pagination {padding-top:18px;gap:10px;font-size:11px;justify-content:space-between;flex-wrap:wrap}.page-size-options,.page-navigation {border:0;padding:0;margin:0;gap:6px}.page-size-options button,.page-navigation button {width:30px;min-width:30px;min-height:30px;height:30px;font-size:11px;padding:0}
  .dsh-search-limit {font-size:11px;color:var(--muted);margin:10px 0}
  .dsh-footer {margin:16px 4px 0;font-size:11px;color:var(--muted);line-height:1.7}
  dialog.dsh-dialog {position:fixed;inset:0;margin:auto;transform:none;width:min(720px,calc(100vw - 40px));max-width:none;max-height:calc(100dvh - 64px);padding:0;border:1px solid var(--border);border-radius:20px;background:var(--surface);color:var(--text);box-shadow:var(--shadow-menu);overflow:auto}
  dialog.dsh-dialog::backdrop {background:color-mix(in srgb,var(--text) 24%,transparent);backdrop-filter:blur(3px)}
  .dsh-dialog-header {display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:24px;border-bottom:1px solid var(--border-soft)}
  .dsh-dialog-header .eyebrow {font-size:11px;letter-spacing:.06em;color:var(--accent);display:flex;align-items:center;gap:7px;margin-bottom:8px}.dsh-dialog-header h2 {font-size:20px;font-weight:600;line-height:1.5;overflow-wrap:anywhere}
  .dsh-dialog-body {padding:24px;display:flex;flex-direction:column;gap:16px}.dsh-dialog-body label:not(.dsh-checkbox) {display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--muted)}
  .dsh-edit-form {display:flex;flex-direction:column;gap:16px}
  .dsh-form-row {display:grid;grid-template-columns:1fr 1fr;gap:14px}.dsh-dialog-body textarea {resize:vertical;min-height:220px;line-height:1.8;color:var(--text)}
  .dsh-checkbox {display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text)}.dsh-checkbox input {accent-color:var(--accent)}
  .dsh-help {font-size:11px;line-height:1.7;color:var(--muted)}.dsh-detail-text {font-size:14px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere}
  .dsh-meta {display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--muted)}.dsh-meta span {padding:4px 8px;background:var(--surface-muted);border-radius:6px}
  .dsh-dialog-footer {display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;padding:18px 24px;border-top:1px solid var(--border-soft)}.dsh-dialog-footer .dsh-delete-button {margin-right:auto;color:var(--danger)}
  @container mory (max-width:1000px) {.workspace-layout{grid-template-columns:160px minmax(0,1fr)}.memory-list-header,.memory-card{grid-template-columns:64px minmax(130px,1fr) 74px 56px!important;gap:10px}.memory-entity,.dsh-entity-label{display:none!important}.feed-section{padding:16px}.product-shell{padding:18px}}
  @container mory (min-width:761px) and (max-width:1000px) {.memory-card .memory-time{grid-column:1!important;grid-row:1!important;width:auto!important}.memory-card .memory-content-cell{grid-column:2!important;grid-row:1!important}.memory-card .memory-content-cell p{display:block!important}.memory-card .memory-category{grid-column:3!important;grid-row:1!important;display:grid!important}.memory-card .memory-life{grid-column:4!important;grid-row:1!important}}
  @container mory (max-width:760px) {.workspace-layout{display:block!important}.workspace-nav{display:none!important}.dsh-mobile-kind{display:block!important}.product-shell{padding:14px}.product-header{margin-bottom:14px}.product-header .brand-lockup span{display:none}.feed-section{border-radius:16px}.header-actions{flex-wrap:nowrap;max-width:none!important}.header-actions .status-chip{display:none}.feed-summary{gap:8px}.dsh-controls{grid-template-columns:minmax(120px,1fr) 115px}.memory-list-header{display:none!important}.memory-card{grid-template-columns:minmax(110px,1fr) 62px 56px!important;min-height:70px;padding:12px 4px}.memory-card .memory-content-cell{grid-column:1!important;grid-row:1!important;display:block!important}.memory-card .memory-content-cell p{display:block!important}.memory-card .memory-time{grid-column:2!important;grid-row:1!important;width:auto!important}.memory-card .memory-life{grid-column:3!important;grid-row:1!important}.memory-category{display:none!important}.memory-pagination{justify-content:space-between!important;flex-wrap:wrap!important}.dsh-filter-row select,.dsh-filter-row input{max-width:none;flex:1 1 110px}.dsh-filter-label{display:none!important}.product-header .brand-lockup{gap:8px}.dsh-dialog-body,.dsh-dialog-header{padding:20px}.dsh-form-row{grid-template-columns:1fr}.dsh-dialog-footer{padding:16px 20px}}
  .dsh-mobile-kind{display:none}
  .feed-section[hidden] {display:none!important}
  .dsh-settings-page {min-height:520px;border:1px solid var(--border);border-radius:20px;padding:24px;background:var(--surface);box-shadow:none}
  .dsh-settings-page .settings-page-header {display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}
  .dsh-settings-page .settings-page-header h1 {font-size:24px;line-height:1.4;font-weight:600}.dsh-settings-page .settings-page-header p {font-size:13px;color:var(--muted);margin-top:8px;line-height:1.7}
  .dsh-settings-page .settings-tabs {display:flex;flex-wrap:wrap;gap:6px;padding:0 0 16px;margin-bottom:24px;border-bottom:1px solid var(--border-soft);overflow:visible}
  .dsh-settings-page .settings-tabs button {padding:9px 12px;min-height:38px;border-radius:10px;background:transparent;color:var(--muted);font-weight:500}
  .dsh-settings-page .settings-tabs button.active {background:var(--surface-muted);color:var(--accent);border-color:var(--border-soft)}
  .dsh-settings-panel {display:flex;flex-direction:column;gap:18px}.dsh-settings-panel>p {color:var(--muted);font-size:13px;line-height:1.8}
  .dsh-settings-form {display:flex;flex-direction:column;gap:16px}.dsh-settings-form label:not(.dsh-checkbox) {display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--muted)}
  .dsh-settings-form input,.dsh-settings-form select {color:var(--text)}.dsh-settings-actions {display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .dsh-settings-form .dsh-checkbox {align-items:flex-start;padding:14px;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface-muted)}.dsh-settings-form .dsh-checkbox input {margin-top:4px}.dsh-settings-form .dsh-checkbox strong,.dsh-settings-form .dsh-checkbox small {display:block}.dsh-settings-form .dsh-checkbox strong {font-weight:500}.dsh-settings-form .dsh-checkbox small {font-size:11px;color:var(--muted);line-height:1.7;margin-top:4px}
  .dsh-settings-page .theme-options {display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))!important;gap:12px!important;max-height:none!important}
  .dsh-settings-page .theme-option {min-height:96px;display:flex;align-items:center;text-align:left;gap:12px;padding:16px;border:1px solid var(--border-soft);border-radius:14px;background:var(--surface);color:var(--text)}
  .dsh-settings-page .theme-option.selected {border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}.dsh-settings-page .theme-swatches {display:flex;gap:3px;flex-shrink:0}.dsh-settings-page .theme-swatches span {width:15px;height:36px;border-radius:5px;border:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
  .dsh-settings-page .theme-option-copy {min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.dsh-settings-page .theme-option-copy strong {font-size:13px;font-weight:500}.dsh-settings-page .theme-option-copy small {font-size:11px;line-height:1.6;color:var(--muted)}.dsh-settings-page .theme-check {width:16px;color:var(--accent)}
  .dsh-health-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.dsh-health-metric {padding:20px 16px;background:var(--surface-muted);border:1px solid var(--border-soft);border-radius:14px}.dsh-health-metric strong {display:block;font-size:26px;font-weight:500;color:var(--text)}.dsh-health-metric span {font-size:12px;color:var(--muted)}
  .dsh-health-details {display:grid;grid-template-columns:minmax(100px,.4fr) minmax(0,1fr);gap:10px 16px;font-size:12px;line-height:1.8}.dsh-health-details dt {color:var(--muted)}.dsh-health-details dd {margin:0;overflow-wrap:anywhere;color:var(--text)}
  .dsh-settings-link {width:100%;justify-content:flex-start!important;gap:8px}.dsh-settings-link.active {color:var(--accent)!important;background:var(--surface-muted)!important}
  @container mory (max-width:760px) {.dsh-settings-page{padding:18px 16px;border-radius:16px}.dsh-settings-page .settings-page-header{flex-direction:column;margin-bottom:18px}.dsh-settings-page .settings-tabs{gap:4px;margin-bottom:18px}.dsh-settings-page .settings-tabs button{padding:8px 10px;font-size:12px}.dsh-health-grid{gap:8px}.dsh-health-metric{padding:14px 10px}.dsh-health-metric strong{font-size:22px}.dsh-health-details{grid-template-columns:1fr;gap:4px}.dsh-health-details dd{margin-bottom:8px}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
}
`;
    const paths = {
      archive: ['M3 5h18v4H3z', 'M5 9v12h14V9', 'M10 13h4'], note: ['M5 3h14v18H5z', 'M9 8h6M9 12h6M9 16h4'],
      chat: ['M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z'], bill: ['M6 3h12v18l-3-2-3 2-3-2-3 2V3Z', 'M9 8h6M9 12h4'],
      finance: ['M3 9h18L12 3 3 9Z', 'M5 10v8M10 10v8M15 10v8M20 10v8M3 21h18'], task: ['M9 3H5v18h14V7', 'm9 8 3 3 8-8'],
      waiting: ['M6 3h12M6 21h12M8 3v5l4 4 4-4V3M8 21v-5l4-4 4 4v5'], bookmark: ['M6 3h12v18l-6-4-6 4V3Z'], file: ['M5 3h9l5 5v13H5V3Z', 'M14 3v6h5'],
      decision: ['M4 4h16v16H4z', 'm8 12 3 3 6-7'], log: ['M4 3h16v18H4z', 'M8 7h8M8 12h8M8 17h4'],
      search: ['M19 19 15 15', 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z'], refresh: ['M20 8a8 8 0 1 0 0 8', 'M20 3v5h-5'],
      close: ['m6 6 12 12M18 6 6 18'], sun: ['M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z', 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1'],
      settings: ['M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'], cloud: ['M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13 1 4 4 0 0 1 0 8H6Z'], globe: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M3 12h18M12 3a17 17 0 0 0 0 18M12 3a17 17 0 0 1 0 18'], health: ['M3 12h4l3-7 4 14 3-7h4'], connection: ['m8 12 8-8M5 8l5 5-5 5M16 12l3-3M13 5l6 6'], moon: ['M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z'], back: ['m10 5-7 7 7 7', 'M4 12h17'], filter: ['M4 7h16M7 12h10M10 17h4'], plus: ['M12 5v14M5 12h14'],
    };
    function Icon({ name = 'archive', size = 18 }) { return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, ...(paths[name] || paths.note).map((d, i) => h('path', { d, key: i }))); }
    function Modal({ title, eyebrow, closeLabel, children, footer, onClose, busy }) {
      const ref = React.useRef(null);
      const closeRef = React.useRef(onClose); closeRef.current = onClose;
      React.useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
      return h('dialog', { className: 'dsh-dialog', ref, 'aria-label': title, onCancel: event => { event.preventDefault(); if (!busy) closeRef.current(); } },
        h('header', { className: 'dsh-dialog-header' }, h('div', null, h('span', { className: 'eyebrow' }, h(Icon), eyebrow), h('h2', null, title)),
          h('button', { type: 'button', 'data-slot': 'button', 'data-variant': 'ghost', className: 'dsh-icon-button', 'aria-label': closeLabel, disabled: busy, onClick: onClose }, h(Icon, { name: 'close' }))),
        h('div', { className: 'dsh-dialog-body' }, children), footer ? h('footer', { className: 'dsh-dialog-footer' }, footer) : null);
    }
    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        for (const [locale, dict] of [['en', en], ['zh', zh], ['zh-CN', zh]]) {
          ctx.effect(() => ctx.locale.register('mory', locale, dict));
          ctx.effect(() => ctx.locale.register('mory.english', locale, en));
          ctx.effect(() => ctx.locale.register('mory.chinese', locale, zh));
        }
        const translations = { auto: ctx.locale.bind('mory'), en: ctx.locale.bind('mory.english'), zh: ctx.locale.bind('mory.chinese') };
        const t = translations.auto;
        const subscribe = fn => ctx.locale.subscribe(fn), snapshot = () => ctx.locale.getSnapshot();
        function Page() {
          const locale = React.useSyncExternalStore(subscribe, snapshot, snapshot);
          const [language, setLanguage] = React.useState('auto');
          const t = translations[language] || translations.auto;
          const sourceLabel = value => Object.hasOwn(en, value) ? t(value) : value;
          const [theme, setTheme] = React.useState(() => { try { const saved = localStorage.getItem('mory.dsh.theme'); return themes.some(item => item.id === saved) ? saved : 'default'; } catch { return 'default'; } });
          const [catalog, setCatalog] = React.useState([]), [loading, setLoading] = React.useState(true), [connected, setConnected] = React.useState(false);
          const [reload, setReload] = React.useState(0), [error, setError] = React.useState(null), [notice, setNotice] = React.useState('');
          const [query, setQuery] = React.useState(''), [searchResults, setSearchResults] = React.useState(null), [searching, setSearching] = React.useState(false);
          const [kind, setKind] = React.useState('all'), [source, setSource] = React.useState('all'), [privacy, setPrivacy] = React.useState('all'), [time, setTime] = React.useState('all');
          const [tag, setTag] = React.useState(''), [projectDraft, setProjectDraft] = React.useState(''), [project, setProject] = React.useState('');
          const [page, setPage] = React.useState(1), [pageSize, setPageSize] = React.useState(10);
          const [selected, setSelected] = React.useState(null), [mode, setMode] = React.useState(null), [draft, setDraft] = React.useState({});
          const [busy, setBusy] = React.useState(false), [confirmDelete, setConfirmDelete] = React.useState(false);
          const [dialogError, setDialogError] = React.useState(null);
          const [settingsTab, setSettingsTab] = React.useState(null), [settings, setSettings] = React.useState(null);
          const [settingsBusy, setSettingsBusy] = React.useState(false), [settingsError, setSettingsError] = React.useState(null), [settingsNotice, setSettingsNotice] = React.useState('');
          const [connectionDraft, setConnectionDraft] = React.useState({ apiUrl: '', token: '' });
          const [syncDraft, setSyncDraft] = React.useState({ provider: 'github', repositoryUrl: '', branch: '', path: 'mory/memories.json', deviceName: '', token: '', autoSync: false });
          const [health, setHealth] = React.useState(null);
          const settingsRef = React.useRef(null);
          const lifetime = React.useRef(null), detailController = React.useRef(null);
          React.useEffect(() => { const controller = new AbortController(); lifetime.current = controller; return () => { controller.abort(); detailController.current?.abort(); }; }, []);
          async function api(action, input = {}, signal) {
            const response = await fetch('api/mory', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...input }), signal: signal || lifetime.current?.signal });
            let result; try { result = await response.json(); } catch { throw new Error(t('failed')); }
            if (!response.ok) { const failure = new Error(result.error?.message || t('failed')); failure.code = result.error?.code; throw failure; } return result;
          }
          function adoptSettings(value, resetDrafts = false) {
            settingsRef.current = value; setSettings(value);
            setTheme(value.appearance); setLanguage(value.language);
            try { localStorage.setItem('mory.dsh.theme', value.appearance); } catch {}
            if (resetDrafts) {
              setConnectionDraft({ apiUrl: value.connection.apiUrl || '', token: '' });
              setSyncDraft({ ...value.sync, token: '' });
            }
          }
          async function readSettings(resetDrafts = false) {
            setSettingsBusy(true); setSettingsError(null);
            try { const value = await api('settings.get'); if (!lifetime.current.signal.aborted) adoptSettings(value, resetDrafts); return value; }
            catch (failure) { if (!lifetime.current.signal.aborted) setSettingsError(failure); return null; }
            finally { if (!lifetime.current.signal.aborted) setSettingsBusy(false); }
          }
          async function saveSettings(patch, resetDrafts = false) {
            if (!settingsRef.current) return null;
            setSettingsBusy(true); setSettingsError(null); setSettingsNotice('');
            try {
              const value = await api('settings.update', { expectedRevision: settingsRef.current.revision, ...patch });
              if (lifetime.current.signal.aborted) return null;
              adoptSettings(value);
              if (resetDrafts && patch.connection) setConnectionDraft({ apiUrl: value.connection.apiUrl || '', token: '' });
              if (resetDrafts && patch.sync) setSyncDraft({ ...value.sync, token: '' });
              setSettingsNotice(t('settingsSaved'));
              if (patch.connection) setReload(value => value + 1);
              return value;
            } catch (failure) { if (!lifetime.current.signal.aborted) setSettingsError(failure); return null; }
            finally { if (!lifetime.current.signal.aborted) setSettingsBusy(false); }
          }
          const connectionPatch = () => ({ apiUrl: connectionDraft.apiUrl.trim(), ...(connectionDraft.token.trim() ? { token: connectionDraft.token.trim() } : {}) });
          const syncPatch = () => ({ provider: syncDraft.provider, repositoryUrl: syncDraft.repositoryUrl.trim(), branch: syncDraft.branch.trim(), path: syncDraft.path.trim(), deviceName: syncDraft.deviceName.trim(), autoSync: syncDraft.autoSync, ...(syncDraft.token.trim() ? { token: syncDraft.token.trim() } : {}) });
          async function runSettings(action, input, patch) {
            if (patch && !await saveSettings(patch, true)) return;
            setSettingsBusy(true); setSettingsError(null); setSettingsNotice('');
            if (action === 'health') setHealth(null);
            try {
              const result = await api(`settings.${action}`, input);
              if (lifetime.current.signal.aborted) return;
              if (action === 'health') setHealth(result);
              if (action === 'check' && input.target === 'sync' && result.branch) setSyncDraft(previous => ({ ...previous, branch: previous.branch || result.branch }));
              setSettingsNotice(t(action === 'sync' ? 'syncDone' : 'connectionOK') + (result.branch ? ` · ${result.branch}` : ''));
              if (result.status === 'partial') { const failure = new Error(result.message || t('failed')); failure.code = result.code; setSettingsError(failure); setSettingsNotice(''); }
              if (action === 'sync') setReload(value => value + 1);
              if (action === 'sync' || action === 'health') { const current = await api('settings.get'); if (!lifetime.current.signal.aborted) adoptSettings(current); }
            } catch (failure) { if (!lifetime.current.signal.aborted) setSettingsError(failure); }
            finally { if (!lifetime.current.signal.aborted) setSettingsBusy(false); }
          }
          React.useEffect(() => { readSettings(true); }, []);
          React.useEffect(() => { if (settingsTab === 'health') runSettings('health', {}); }, [settingsTab]);
          React.useEffect(() => {
            const controller = new AbortController(); setLoading(true); setError(null);
            (async () => {
              const records = []; let offset = 0;
              do {
                const result = await api('list', { limit: 50, offset, ...(project ? { projectId: project } : {}) }, controller.signal);
                if (result.total > 10000) throw new Error(t('catalogLimit'));
                records.push(...result.memories);
                if (result.nextOffset != null && result.nextOffset <= offset) throw new Error(t('failed'));
                offset = result.nextOffset;
              } while (offset != null && !controller.signal.aborted);
              if (!controller.signal.aborted) { setCatalog(records); setConnected(true); }
            })().catch(failure => { if (!controller.signal.aborted) { setError(failure); setConnected(false); setCatalog([]); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
            return () => controller.abort();
          }, [project, reload]);
          React.useEffect(() => {
            const controller = new AbortController();
            if (!query.trim()) { setSearchResults(null); setSearching(false); return () => controller.abort(); }
            setSearching(true); setSearchResults([]);
            const timer = setTimeout(() => {
              api('search', { query: query.trim(), limit: 50, ...(project ? { projectId: project } : {}) }, controller.signal)
                .then(result => { if (!controller.signal.aborted) setSearchResults(result.results.map(item => item.memory)); })
                .catch(failure => { if (!controller.signal.aborted) setError(failure); })
                .finally(() => { if (!controller.signal.aborted) setSearching(false); });
            }, 250);
            return () => { clearTimeout(timer); controller.abort(); };
          }, [query, project, reload]);
          React.useEffect(() => { setPage(1); }, [query, project, kind, source, privacy, time, tag, pageSize]);
          const filtered = (searchResults || catalog).filter(memory => {
            const created = new Date(memory.capturedAt || memory.updatedAt);
            const now = new Date(), age = now - created;
            const dateMatches = time === 'all' || (time === 'today' ? created.toDateString() === now.toDateString() : age >= 0 && age <= (time === 'week' ? 7 : 30) * 86400000);
            return (kind === 'all' || memory.kind === kind) && (source === 'all' || memory.source === source) && (privacy === 'all' || !!memory.isPrivate === (privacy === 'private')) && dateMatches && (!tag.trim() || (memory.tags || []).some(value => value.toLowerCase().includes(tag.trim().replace(/^#/, '').toLowerCase())));
          });
          const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, totalPages);
          const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
          const counts = Object.fromEntries(kinds.map(value => [value, catalog.filter(memory => memory.kind === value).length]));
          const today = catalog.filter(memory => new Date(memory.capturedAt || memory.updatedAt).toDateString() === new Date().toDateString()).length;
          const topics = new Set(catalog.flatMap(memory => memory.tags || [])).size;
          const sources = [...new Set(catalog.map(memory => memory.source).filter(Boolean))];
          const editing = mode === 'edit' || mode === 'create';
          const editable = selected && selected.payload.content.length <= 200000 && selected.tags.length <= 50;
          function close() { if (busy) return; if (editing) { setDialogError(new Error(t('unsaved'))); return; } setMode(null); setSelected(null); setConfirmDelete(false); setDialogError(null); }
          function cancelEdit() { setMode(selected ? 'detail' : null); setDialogError(null); }
          function create() { setSelected(null); setDraft({ title: '', text: '', tags: '', kind: kind === 'all' ? 'note' : kind, isPrivate: false }); setDialogError(null); setMode('create'); }
          async function open(memory) {
            if (busy) return; detailController.current?.abort(); const controller = new AbortController(); detailController.current = controller; setBusy(true); setError(null);
            try { const result = await api('get', { memoryId: memory.id }, controller.signal); if (!controller.signal.aborted) { setSelected(result.memory); setMode('detail'); setDialogError(null); setConfirmDelete(false); } }
            catch (failure) { if (!controller.signal.aborted) setError(failure); } finally { if (!controller.signal.aborted) setBusy(false); }
          }
          function edit() { if (!editable) return; setDraft({ title: selected.payload.title, text: selected.payload.content, tags: selected.tags.join(', '), kind: selected.kind, isPrivate: selected.isPrivate }); setMode('edit'); setDialogError(null); setConfirmDelete(false); }
          async function mutate(action, input) {
            setBusy(true); setDialogError(null); setNotice('');
            try { const result = await api(action, input); if (lifetime.current.signal.aborted) return;
              setSelected(action === 'forget' ? null : result.memory); setMode(action === 'forget' ? null : 'detail'); setConfirmDelete(false); setNotice(t(action === 'forget' ? 'deleted' : 'saved')); setReload(value => value + 1);
            } catch (failure) { if (!lifetime.current.signal.aborted) setDialogError(failure); }
            finally { if (!lifetime.current.signal.aborted) setBusy(false); }
          }
          function save(event) {
            event.preventDefault(); if (busy) return;
            const input = { ...draft, tags: draft.tags.split(/[,，]/u).map(value => value.trim()).filter(Boolean) };
            if (mode === 'edit') { Object.assign(input, { memoryId: selected.id, expectedRevision: selected.revision }); if (draft.tags === selected.tags.join(', ')) delete input.tags; }
            else if (project) input.projectId = project;
            mutate(mode === 'edit' ? 'update' : 'create', input);
          }
          const button = (text, onClick, props = {}) => h('button', { type: 'button', 'data-slot': 'button', 'data-variant': 'outline', disabled: busy, onClick, ...props }, text);
          const select = (value, onChange, items, label, props = {}) => h('select', { value, onChange: event => onChange(event.target.value), 'aria-label': label, disabled: busy, ...props }, ...items.map(([key, text]) => h('option', { key, value: key }, text)));
          const field = (name, key, type = 'input', extra = {}) => h('label', { key }, t(name), h(type, { 'data-slot': type === 'textarea' ? 'textarea' : 'input', value: draft[key] || '', disabled: busy, onChange: event => setDraft(previous => ({ ...previous, [key]: event.target.value })), ...extra }));
          const noticeView = failure => h('div', { className: 'dsh-notice error', role: 'alert' }, failure.code === 'REVISION_CONFLICT' ? t('conflict') : failure.message);
          function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale.active, { month: 'short', day: 'numeric' }).format(date); }
          function chooseKind(value) { setSettingsTab(null); setKind(value); setQuery(''); }
          function resetFilters() { setKind('all'); setSource('all'); setTime('all'); setPrivacy('all'); setTag(''); setQuery(''); }
          const navButton = value => button([h(Icon, { name: value === 'all' ? 'archive' : value, size: 17, key: 'icon' }), h('span', { key: 'text' }, t(value)), h('strong', { key: 'count' }, value === 'all' ? catalog.length : counts[value])], () => chooseKind(value), { key: value, 'data-variant': 'ghost', className: !settingsTab && kind === value ? 'active' : '', 'aria-pressed': !settingsTab && kind === value });
          const settingsTabs = [['sync', 'syncSettings', 'cloud'], ['language', 'languageSettings', 'globe'], ['theme', 'themeSettings', 'sun'], ['health', 'healthSettings', 'health'], ['connection', 'connectionSettings', 'connection']];
          const settingsDisabled = settingsBusy || !settings;
          const settingsButton = (label, onClick, props = {}) => button(label, onClick, { disabled: settingsDisabled, ...props });
          const settingsField = (label, value, onChange, props = {}) => h('label', null, t(label), h('input', { 'data-slot': 'input', value: value || '', disabled: settingsBusy, onChange: event => onChange(event.target.value), ...props }));
          const patchConnection = (key, value) => setConnectionDraft(previous => ({ ...previous, [key]: value }));
          const patchSync = (key, value) => setSyncDraft(previous => ({ ...previous, [key]: value }));
          const syncActions = h('div', { className: 'dsh-settings-actions' },
            settingsButton(t('mergePush'), () => runSettings('sync', { mode: 'merge' }, { sync: syncPatch() }), { 'data-variant': 'default' }),
            settingsButton(t('pushRemote'), () => runSettings('sync', { mode: 'push' }, { sync: syncPatch() })),
            settingsButton(t('pullRemote'), () => runSettings('sync', { mode: 'pull' }, { sync: syncPatch() })));
          const lastSync = settings?.lastSync;
          const lastSyncMessage = lastSync ? lastSync.message || lastSync.error || t(lastSync.status === 'running' ? 'syncing' : lastSync.status === 'success' ? 'syncDone' : 'failed') : t('neverSynced');
          const settingsContent = settingsTab === 'theme' ? h('section', { className: 'dsh-settings-panel' }, h('p', null, t('appearanceHint')),
              h('div', { className: 'theme-options', role: 'group', 'aria-label': t('themeSettings') }, ...themes.map(item => h('button', { key: item.id, type: 'button', className: `theme-option ${theme === item.id ? 'selected' : ''}`, 'aria-pressed': theme === item.id, disabled: settingsDisabled, onClick: () => saveSettings({ appearance: item.id }) },
                h('span', { className: 'theme-swatches', 'aria-hidden': true }, ...item.swatches.map(color => h('span', { key: color, style: { backgroundColor: color } }))), h('span', { className: 'theme-option-copy' }, h('strong', null, t(`themeName.${item.id}`)), h('small', null, t(`themeHint.${item.id}`))), h('span', { className: 'theme-check', 'aria-hidden': true }, theme === item.id ? '✓' : '')))))
            : settingsTab === 'language' ? h('section', { className: 'dsh-settings-panel' }, h('p', null, t('languageHint')), h('div', { className: 'dsh-settings-form' }, h('label', null, t('languageSettings'), select(language, value => saveSettings({ language: value }), [['auto', t('followDSH')], ['en', 'English'], ['zh', '简体中文']], t('languageSettings'), { disabled: settingsDisabled }))))
            : settingsTab === 'connection' ? h('section', { className: 'dsh-settings-panel' }, h('p', null, t('connectionHint')),
              h('form', { className: 'dsh-settings-form', onSubmit: event => { event.preventDefault(); saveSettings({ connection: connectionPatch() }, true); } },
                settingsField('apiUrl', connectionDraft.apiUrl, value => patchConnection('apiUrl', value), { type: 'url', placeholder: t('autoDetect'), maxLength: 2048 }),
                settingsField('accessToken', connectionDraft.token, value => patchConnection('token', value), { type: 'password', autoComplete: 'new-password', placeholder: t(settings?.connection.tokenConfigured ? 'storedToken' : 'tokenOptional'), maxLength: 8192 }),
                h('p', { className: 'dsh-help' }, t('connectionPrecedence')),
                h('div', { className: 'dsh-settings-actions' }, settingsButton(t('saveSettings'), undefined, { type: 'submit', 'data-variant': 'default' }), settingsButton(t('checkConnection'), () => runSettings('check', { target: 'mory' }, { connection: connectionPatch() })), settingsButton(t('autoDetect'), () => saveSettings({ connection: { apiUrl: '', token: null } }, true)))))
            : settingsTab === 'health' ? h('section', { className: 'dsh-settings-panel' }, h('p', null, t('healthHint')),
              h('div', { className: 'dsh-health-grid' }, ...[[health?.total ?? catalog.length, 'totalMemories'], [today, 'today'], [topics, 'topics']].map(([value, key]) => h('div', { className: 'dsh-health-metric', key }, h('strong', null, value), h('span', null, t(key))))),
              h('dl', { className: 'dsh-health-details' }, h('dt', null, t('connectionStatus')), h('dd', null, t(health?.connected ? 'connected' : 'offline')), h('dt', null, t('serviceAddress')), h('dd', null, health?.apiUrl || settings?.connection.apiUrl || t('autoDetect')), h('dt', null, t('lastSync')), h('dd', null, lastSyncMessage)),
              h('div', { className: 'dsh-settings-actions' }, settingsButton(t('checkConnection'), () => runSettings('health', {}))))
            : h('section', { className: 'dsh-settings-panel' }, h('p', null, t('syncHint')),
              h('form', { className: 'dsh-settings-form', onSubmit: event => { event.preventDefault(); saveSettings({ sync: syncPatch() }, true); } },
                h('div', { className: 'dsh-form-row' }, h('label', null, t('provider'), select(syncDraft.provider, value => patchSync('provider', value), [['github', 'GitHub'], ['gitee', 'Gitee']], t('provider'), { disabled: settingsBusy })), settingsField('repositoryUrl', syncDraft.repositoryUrl, value => patchSync('repositoryUrl', value), { type: 'url', placeholder: `https://${syncDraft.provider}.com/owner/repository`, maxLength: 2048 })),
                h('div', { className: 'dsh-form-row' }, settingsField('accessToken', syncDraft.token, value => patchSync('token', value), { type: 'password', autoComplete: 'new-password', placeholder: t(settings?.sync.tokenConfigured ? 'storedToken' : 'accessToken'), maxLength: 8192 }), settingsField('deviceName', syncDraft.deviceName, value => patchSync('deviceName', value), { maxLength: 128 })),
                h('div', { className: 'dsh-form-row' }, settingsField('branch', syncDraft.branch, value => patchSync('branch', value), { placeholder: 'main', maxLength: 256 }), settingsField('filePath', syncDraft.path, value => patchSync('path', value), { placeholder: 'mory/memories.json', maxLength: 1024 })),
                h('label', { className: 'dsh-checkbox' }, h('input', { type: 'checkbox', checked: !!syncDraft.autoSync, disabled: settingsBusy, onChange: event => patchSync('autoSync', event.target.checked) }), h('span', null, h('strong', null, t('autoSync')), h('small', null, t('autoSyncHint')))),
                h('div', { className: 'dsh-settings-actions' }, settingsButton(t('saveSettings'), undefined, { type: 'submit', 'data-variant': 'default' }), settingsButton(t('checkConnection'), () => runSettings('check', { target: 'sync' }, { sync: syncPatch() })))),
              h('div', { className: 'dsh-notice' }, t('syncPrivacy')), syncActions,
              h('p', { className: 'dsh-help' }, `${t('lastSync')}: ${lastSyncMessage}`));
          const settingsView = settingsTab ? h('section', { className: 'settings-page dsh-settings-page', 'aria-label': t('settings') },
            h('header', { className: 'settings-page-header' }, h('div', null, h('h1', null, t('settings')), h('p', null, t('settingsHint'))), button([h(Icon, { name: 'back', key: 'icon', size: 15 }), t('returnMemories')], () => setSettingsTab(null))),
            h('nav', { className: 'settings-tabs', 'aria-label': t('settings') }, ...settingsTabs.map(([key, label, icon]) => button([h(Icon, { name: icon, key: 'icon', size: 15 }), t(label)], () => setSettingsTab(key), { key, className: settingsTab === key ? 'active' : '', 'aria-pressed': settingsTab === key }))),
            settingsError ? h('div', { className: 'dsh-notice error', role: 'alert' }, h('span', null, ['REVISION_CONFLICT', 'SETTINGS_CONFLICT'].includes(settingsError.code) ? t('settingsConflict') : settingsError.message), button(t('reloadSettings'), () => readSettings(true), { disabled: settingsBusy })) : null,
            settingsNotice ? h('div', { className: 'dsh-notice success', role: 'status' }, settingsNotice) : null,
            settingsBusy ? h('p', { className: 'dsh-help', role: 'status' }, t('checking')) : null,
            settingsContent) : null;
          const details = mode && h(Modal, { title: mode === 'create' ? t('add') : editing ? t('edit') : selected.payload.title, eyebrow: t(mode === 'create' ? 'add' : 'detail'), closeLabel: t('close'), onClose: close, busy,
            footer: editing ? [button(t('cancel'), cancelEdit, { key: 'cancel' }), button(t('save'), save, { key: 'save', 'data-variant': 'default', disabled: busy || (!draft.title.trim() && !draft.text.trim()) })] : [button(t('remove'), () => setConfirmDelete(true), { key: 'delete', 'data-variant': 'ghost', className: 'dsh-delete-button' }), button(t('close'), close, { key: 'close' }), button(t('edit'), edit, { key: 'edit', 'data-variant': 'default', disabled: busy || !editable })],
          }, dialogError ? noticeView(dialogError) : null,
            editing ? h('form', { onSubmit: save, className: 'dsh-edit-form' },
              field('title', 'title', 'input', { maxLength: 4096, autoFocus: true }),
              h('div', { className: 'dsh-form-row' }, h('label', null, t('kind'), select(draft.kind, value => setDraft(previous => ({ ...previous, kind: value })), kinds.map(value => [value, t(value)]), t('kind'))), field('tags', 'tags')),
              field('content', 'text', 'textarea', { maxLength: 200000 }),
              h('label', { className: 'dsh-checkbox' }, h('input', { type: 'checkbox', checked: !!draft.isPrivate, disabled: busy, onChange: event => setDraft(previous => ({ ...previous, isPrivate: event.target.checked })) }), t('markPrivate')),
              h('p', { className: 'dsh-help' }, t('privateHint')))
              : h(React.Fragment, null,
                h('div', { className: 'dsh-meta' }, h('span', null, t(selected.kind)), h('span', null, sourceLabel(selected.source)), h('span', null, `${t('revision')} ${selected.revision}`), h('span', null, formatTime(selected.capturedAt)), ...selected.tags.map((value, index) => h('span', { key: index }, `#${value}`))),
                h('div', { className: 'dsh-detail-text' }, selected.payload.content),
                !editable ? h('p', { className: 'dsh-help' }, t('tooLarge')) : null,
                selected.isPrivate ? h('p', { className: 'dsh-help' }, `${t('private')} · ${t('privateHint')}`) : null,
                confirmDelete ? h('div', { className: 'dsh-notice error', role: 'group', 'aria-label': t('confirm') }, h('div', null, h('strong', null, t('confirm')), h('p', { className: 'dsh-help' }, t('confirmHint'))), button(t('cancel'), () => setConfirmDelete(false)), button(t('confirmDelete'), () => mutate('forget', { memoryId: selected.id, expectedRevision: selected.revision }), { 'data-variant': 'destructive' })) : null));
          return h('div', { className: 'mory-app', 'data-theme': theme, 'data-mory-version': '0.1.2' }, h('style', null, css + adaptation),
            h('main', { className: 'product-shell' },
              h('header', { className: 'product-header' }, h('div', { className: 'brand-lockup' }, h('div', { className: 'brand-glyph logo-mark' }, h('img', { src: logo, alt: 'Mory', className: 'mory-original-logo' })), h('div', null, h('strong', null, 'Mory'), h('span', null, t('repository')))),
                h('div', { className: 'header-actions' }, h('span', { className: `status-chip ${connected ? 'good' : 'error'}`, role: 'status' }, h('i', { className: 'dsh-status-dot' }), `${t(connected ? 'local' : 'offline')} · ${catalog.length} ${t('objects')}`),
                  button(h(Icon, { name: 'settings', size: 18 }), () => setSettingsTab(settingsTab ? null : 'sync'), { className: 'dsh-icon-button', title: t('settings'), 'aria-label': t('settings'), 'aria-pressed': !!settingsTab, 'data-variant': 'ghost' }),
                  button(h(Icon, { name: 'back', size: 17 }), () => ctx.layout.selectPanel(null), { className: 'dsh-icon-button', title: t('back'), 'aria-label': t('back'), 'data-variant': 'ghost' }))),
              h('section', { className: 'workspace-layout' }, h('aside', { className: 'workspace-nav', 'aria-label': t('recordTypes') }, h('div', { className: 'nav-section-label' }, t('recordTypes')), h('div', { className: 'record-nav-list all-memory-list' }, navButton('all')), h('div', { className: 'record-nav-list all-types-list' }, ...kinds.map(navButton)), h('div', { className: 'sidebar-footer' }, button([h(Icon, { name: 'settings', key: 'icon', size: 16 }), t('settings')], () => setSettingsTab('sync'), { className: `dsh-settings-link ${settingsTab ? 'active' : ''}`, 'data-variant': 'ghost', 'aria-pressed': !!settingsTab }), h('p', { style: { marginTop: 12 } }, t('shared')))),
                h('div', { className: 'workspace-main' }, settingsView, h('section', { className: 'feed-section', hidden: !!settingsTab },
                  h('div', { className: 'section-heading' }, button([h(Icon, { name: 'plus', key: 'icon', size: 16 }), t('add')], create, { className: 'capture-cta feed-capture-button', 'data-variant': 'default' }), h('div', { className: 'feed-summary' }, h('span', null, h('strong', null, today), ` ${t('today')}`), h('span', null, h('strong', null, topics), ` ${t('topics')}`)), button(h(Icon, { name: 'refresh', size: 17 }), () => setReload(value => value + 1), { className: 'dsh-icon-button', title: t('refresh'), 'aria-label': t('refresh'), disabled: busy || loading })),
                  h('div', { className: 'dsh-controls', role: 'search' }, h('label', { className: 'search-input' }, h(Icon, { name: 'search', size: 17 }), h('input', { 'data-slot': 'input', type: 'search', value: query, maxLength: 4096, placeholder: t('search'), 'aria-label': t('search'), disabled: busy, onChange: event => setQuery(event.target.value) })), select(source, setSource, [['all', t('allSources')], ...sources.map(value => [value, sourceLabel(value)])], t('entity'))),
                  h('div', { className: 'dsh-filter-row' }, h('span', { className: 'dsh-filter-label' }, h(Icon, { name: 'filter', size: 14 }), t('filters')), select(kind, chooseKind, [['all', t('all')], ...kinds.map(value => [value, t(value)])], t('recordTypes'), { className: 'dsh-mobile-kind' }), select(time, setTime, ['all', 'today', 'week', 'month'].map(value => [value, t(value === 'all' ? 'allTime' : value)]), t('time')), select(privacy, setPrivacy, ['all', 'public', 'private'].map(value => [value, t(value === 'all' ? 'allPrivacy' : value)]), t('allPrivacy')),
                    h('input', { 'data-slot': 'input', value: tag, placeholder: t('tag'), 'aria-label': t('tag'), onChange: event => setTag(event.target.value) }), h('form', { onSubmit: event => { event.preventDefault(); setProject(projectDraft.trim()); }, style: { display: 'contents' } }, h('input', { 'data-slot': 'input', value: projectDraft, maxLength: 256, placeholder: t('project'), 'aria-label': t('project'), onChange: event => setProjectDraft(event.target.value), onBlur: () => setProject(projectDraft.trim()) }))),
                  error ? noticeView(error) : null, notice ? h('div', { className: 'dsh-notice success', role: 'status' }, notice) : null,
                  !connected && !loading ? h('div', { className: 'dsh-setup' }, h('h2', null, t('setup')), h('p', null, t('setupHint')), h('pre', null, 'npm install -g @illli-studio/mory\nmory init\nmory start --background')) : null,
                  loading || searching ? h('div', { className: 'empty-feed', role: 'status' }, h(Icon, { name: 'waiting', size: 28 }), h('h3', null, t('loading')), h('p', null, t('reading')))
                    : !visible.length ? h('div', { className: 'empty-feed' }, h(Icon, { name: 'archive', size: 30 }), h('h3', null, t(catalog.length || query ? 'noMatch' : 'empty')), h('p', null, t('emptyHint')), catalog.length || query ? button(t('clear'), resetFilters) : button(t('add'), create, { 'data-variant': 'default' }))
                      : h(React.Fragment, null, h('div', { className: 'memory-list-header' }, h('span', null, t('time')), h('span', { className: 'dsh-entity-label' }, t('entity')), h('span', null, t('content')), h('span', null, t('category')), h('span', null, t('lifecycle'))),
                        h('div', { className: 'memory-grid' }, ...visible.map(memory => h('article', { key: memory.id, className: 'memory-card', role: 'button', tabIndex: busy ? -1 : 0, 'aria-label': memory.isPrivate ? t('private') : memory.title, 'aria-disabled': busy, onClick: event => { if (!event.target.closest('button')) open(memory); }, onKeyDown: event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); open(memory); } } },
                          h('div', { className: 'memory-time', title: memory.capturedAt || memory.updatedAt }, formatTime(memory.capturedAt || memory.updatedAt)), h('div', { className: 'memory-entity' }, h('strong', null, memory.origin?.deviceName || t('localDevice')), h('span', null, sourceLabel(memory.source))),
                          h('div', { className: 'memory-content-cell' }, button(memory.isPrivate ? t('private') : memory.title, () => open(memory), { className: 'memory-title-button', 'data-variant': 'ghost' }), h('p', null, memory.isPrivate ? t('private') : memory.preview)), h('div', { className: 'memory-category' }, button(t(memory.kind), () => chooseKind(memory.kind), { className: 'dsh-kind', 'data-variant': 'ghost' }), memory.tags[0] ? h('span', null, `#${memory.tags[0]}`) : null), h('div', { className: 'memory-life' }, h('span', { 'data-slot': 'badge' }, t('active')))))),
                        h('nav', { className: 'memory-pagination', 'aria-label': t('page') }, h('div', { className: 'page-size-options' }, h('span', null, t('pageSize')), ...[10, 20, 50].map(size => button(String(size), () => setPageSize(size), { key: size, 'data-variant': size === pageSize ? 'default' : 'outline', 'aria-pressed': size === pageSize }))), h('div', { className: 'page-navigation' }, button('‹', () => setPage(currentPage - 1), { disabled: busy || currentPage <= 1, 'aria-label': t('previous') }), h('span', null, `${currentPage} ${t('of')} ${totalPages}`), button('›', () => setPage(currentPage + 1), { disabled: busy || currentPage >= totalPages, 'aria-label': t('next') })))),
                  query.trim() ? h('p', { className: 'dsh-search-limit' }, t('searchLimit')) : null), h('footer', { className: 'dsh-footer' }, t('shared'))))), details);
        }
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'mory', order: 20, label: () => t('name') }, Icon));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'mory' }, Page));
      },
    };
  },
});
