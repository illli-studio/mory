# Mory for DeepSeek Harness

在 DSH 左侧栏使用 Mory，并让智能体访问同一个本地记忆库。

This package adds a native React Mory panel to the DeepSeek Harness sidebar and a
`mory_memory` agent tool. It connects to the existing Mory API; it does not embed
an iframe or start another web server.

## Requirements / 使用条件

- DSH `>=0.2.1-rc.5 <0.3.0` with its Web UI, Connection and Tools services.
- Node.js 22.18+ for the Mory runtime and development checks.
- A running Mory service on the computer hosting DSH. The online browser-only
  repository at `me.mory.cloud` is not automatically connected or imported.

```sh
npm install -g @illli-studio/mory
mory init
mory start --background
```

If Mory is already running, keep using it. The plugin reads `MORY_HOME/config.json`
or `~/.mory/config.json` on the DSH host, respecting its port and token. Memory
content stays in the existing Mory SQLite repository; disabling this plugin does
not delete it.

## Install / 安装

Install the published npm package in the DSH profile you use:

```sh
dsh plugin --profile web add @illli-studio/dsh-mory
```

Replace `web` with your actual profile name, such as `desktop`. To reproduce
version 0.1.2, use `@illli-studio/dsh-mory@0.1.2` as the install spec. You can
also enter the package name in DSH → Plugins → install from a package/directory.
Enable the bundle, then click **Mory** in the left sidebar.

For development, install the **absolute path to `packages/dsh-mory`** instead.
The plugin manager handles profile installation; do not manually edit DSH's
profile manifest. Publishing to npm and marketplace review are separate steps.

Directory compatibility declaration:

```yaml
dshTarget: 0.2.1-rc.5
```

This is the harness release exercised during development. The package declares
`engines.dsh: ">=0.2.1-rc.5 <0.3.0"`; earlier releases are outside the declared
support range, are blocked by that compatibility requirement, and have not been
runtime-tested. A compatible Mory service is required separately; installation
does not start one for you.

On a first install, DSH may apply the plugin live. An update to an already loaded
plugin module requires restarting DSH, then refreshing the existing page. In
particular, upgrading an earlier release to 0.1.2 requires that restart to load
the settings-enabled client and Host module. Follow any `restart-required` result reported by
the plugin manager.

## Panel / 面板

- Browse recent memories with pagination; search text and filter by project ID.
- Create a memory with title, exact text, kind, tags and a privacy flag.
- Read full content, edit, or confirm deletion inline.
- Updates and deletions require the version last read. A concurrent web/agent edit
  produces a conflict and preserves your draft; cancel and reopen to reread it.
- The native panel reuses the original Mory website's branding, navigation, memory
  list, controls and dialogs. All 25 original themes stay scoped to the Mory panel.
  English and Chinese are included.
- Responsive width breakpoints follow the space available to the plugin, so the
  Mory layout adapts correctly beside the DSH sidebar.
- Existing records above 200000 content characters or 50 tags are readable, but
  use the Mory web console to edit them. The panel never saves a truncated draft.
- Type navigation and table rows follow the website layout. Filter by source,
  time, visibility, tag, or project; choose 10, 20, or 50 rows per page.
- The panel loads up to 10000 memory previews for navigation counts and filters;
  enter a project ID to narrow larger repositories. Search shows up to 50 ranked
  matches. Clear the search to return to the complete loaded list.
- New memories, details and edits open on demand in native dialogs, with keyboard
  focus handling and draft protection.

The privacy flag affects presentation and does not encrypt or restrict agent
access. Project IDs are filters, not access boundaries. Omitting a project filter
searches/lists all projects; operations by memory ID use that ID directly.

## Settings / 设置

Open the gear button in the top-right corner, or Settings at the foot of the
Mory type navigation. The top-right entry is also available at narrow widths.

- **Memory Sync / 记忆同步**: configure a private GitHub or Gitee repository,
  access token, branch, JSON snapshot path, and device name. Check the connection,
  merge and push, push, or pull. Push/merge read and merge both sides before
  uploading; pull preserves unrelated local records. Tombstones take precedence,
  and divergent content is retained under a conflict ID. Device names apply to
  memories subsequently created through this plugin or its agent tool.
- **Language / 语言**: follow DSH, English, or Chinese for Mory only.
- **Appearance / 外观主题**: select any of the 25 original website themes.
- **Health / 健康状态**: check the protected Mory API, service address, repository
  count and last synchronization status.
- **Mory Connection / Mory 连接**: enter an API origin and token, check it, or
  return to automatic local detection. These settings work even before a Mory
  service has been connected. Advanced plugin/environment values take priority.

Preferences and credentials are persisted on the DSH host in
`MORY_HOME/dsh-plugin.json` (default `~/.mory/dsh-plugin.json`), separately from the
Mory runtime configuration. Blank token fields preserve stored credentials. Reads
return only credential-presence flags; stored token values are not sent back to
the page or the model. The file is not an encrypted vault; its access is governed
by the host filesystem. Settings updates require the revision from the last read.

Automatic backup is opt-in and runs five seconds after a successful memory
mutation through this plugin or its agent tool. Saving settings, opening a page,
or reading memories does not upload anything. Changes made directly through
another web/API client do not trigger this plugin's automatic backup. Background
errors are available in the last sync status. Synchronization includes private
memories and deletion records, so a private repository is required.

The matching `mory_settings` tool exposes `get`, `update`, `check`, `health` and
`sync`. `update` requires `expectedRevision`; `check` requires `target` (`mory` or
`sync`); `sync` requires `mode` (`pull`, `push`, or `merge`). `connection` and `sync`
objects accept an optional token: omitted/empty keeps it, `null` removes the saved
override. A changed API origin cannot inherit a token bound to another origin.
Changing providers likewise requires a token for the selected provider.

Remote commit and local reconciliation are reported separately. If the remote
commit succeeds but the local generation has changed, the result is explicitly
`status: "partial"`; the UI shows a warning and preserves local data. Pull or
merge again to reconcile. No live remote repository is written during tests.

## Agent tool / 智能体工具

`mory_memory` exposes these actions:

| Action | Input | Result |
| --- | --- | --- |
| `status` | none | Authenticated connection check |
| `list` | optional `projectId`, `limit`, `offset` | Bounded previews and `nextOffset` |
| `search` | `query`, optional `projectId`, `limit` | Ranked memory previews |
| `context` | same as search | Relevant context, capped at 24000 characters |
| `get` | `memoryId`, optional `textOffset`, `textLimit` | Memory preview, content slice and `nextTextOffset` |
| `create` | `text` or `title`, optional `kind`, `tags`, `projectId`, `isPrivate` | Stored memory ID/revision; exact text, no extraction |
| `update` | `memoryId`, `expectedRevision`, changed fields | Corrected memory ID/revision |
| `forget` | `memoryId`, `expectedRevision` | Tombstone deletion |

List/search limit is 1–50. Tool `get` defaults to 12000 content characters per
response, maximum 20000; continue at `nextTextOffset`. Previews shorten titles,
text and tags. Panel edits read the original complete record and preserve fields
outside the editor, including the original URL and metadata.

The panel and tool call the same `MoryService.execute` operations. Native tool
name `mory_memory` avoids colliding with the existing Mory MCP tool names. You do
not need an additional MCP connection for this plugin. It does not automatically
collect conversations or inject every memory into every model request.

Example requests:

```json
{"action":"search","query":"Mory 项目决定","limit":5}
```

```json
{"action":"create","text":"Mory 的 DSH 插件使用原生侧栏页面。","kind":"decision","projectId":"mory"}
```

```json
{"action":"update","memoryId":"<id from get>","expectedRevision":1,"text":"Corrected text"}
```

## Connection configuration / 连接配置

Environment variables are read on the DSH host, not the browser:

- `MORY_HOME`: directory containing `config.json` (default `~/.mory`).
- `MORY_API_URL`: override the API origin, for example `http://127.0.0.1:8787`.
- `MORY_API_TOKEN`: override the bearer token.

Advanced Loader row config accepts `apiUrl`, `configPath` (absolute path), and
`tokenEnv` (environment variable name). Credentials entered in the settings
password field are sent to the authenticated DSH backend and stored there;
reading settings does not return them. Default row config is `{}`. To override it in your own bundle patch:

```yaml
- id: mory
  config:
    apiUrl: 'https://memory.example.com'
    tokenEnv: MORY_REMOTE_TOKEN
```

Use HTTPS for a remote service. URLs must be origins without path/query/embedded
credentials. The plugin does not forward a local token to a remote origin unless
an explicit token is entered for that origin or supplied through the environment,
and refuses HTTP redirects.
Remote hosting must independently provide a compatible authenticated Mory API.

`/api/mory` is an authenticated, exact POST Fetch route registered through DSH
Connection. Stored Mory tokens are never included in settings responses. Requests are limited to
1 MiB, upstream responses to 8 MiB, and upstream calls to 40 seconds. Token
configuration errors and revision conflicts are displayed in the panel.

## Develop, check, pack / 开发与打包

No bundler, runtime dependencies or installation scripts are required. The client
uses DSH's React module table and supported slot/services APIs. Edit
`src/client.js`, then run `build` to generate `client.js` and check JavaScript
syntax. Do not edit the generated artifact directly.

The zero-dependency generator reads the complete original website stylesheet
from `apps/web/src/styles.css` and logo from
`apps/web/public/mory-logo-premium.svg`. It preserves the stylesheet's historical
cascade, removes the Tailwind import, localizes document-root selectors inside
native `@scope (.mory-app)`, and converts width-only media rules to named Mory
container queries. Mixed orientation/media rules remain intact. The Tailwind
semantic-variable block becomes local CSS variables; no Tailwind utilities are
compiled. The panel uses native components rather than an iframe, and does not
change the DSH document root or body.

Each author build refreshes the original CSS/logo snapshots under `assets/` and
copies the original website logo to `icon.svg`. Those snapshots, source code,
build script and adapter tests ship in the npm archive, allowing `npm run build`
and `npm pack` to work from an extracted package without the rest of this
repository. When original repository assets are absent, the generator uses the
packaged snapshots. `assets/source.json` records source paths and SHA-256 hashes.
See [source asset notes](docs/source-assets.md) for the exact build boundary.

From the repository root:

```sh
pnpm --filter @illli-studio/dsh-mory build
pnpm --filter @illli-studio/dsh-mory test
```

Or independently from this package directory:

```sh
npm run build
npm test
npm pack --dry-run
npm pack
```

`prepack` rebuilds the client, runs syntax checks and runs the adapter/Host tests.
Inspect the dry-run file list for `index.js`, `service.mjs`, generated `client.js`,
`src/client.js`, `scripts/build-client.mjs`, source snapshots under `assets/`,
adapter tests, source notes, `cordis.patch.yml`, English and Chinese locale JSON,
`icon.svg`, the README and license. No secrets or local Mory data should be in
the archive.

For a release, sign in to npm with publish rights for the `@illli-studio` scope,
set the intended version in this package, complete the checks, and run:

```sh
npm publish --access public
```

Publishing is a separate explicit action. To appear in a plugin marketplace,
submit the published npm package to the marketplace index you intend to use;
this bundle manifest alone does not enroll it in any index.

After installation verify: sidebar → Mory, initial connection, create/search/edit
one disposable memory, concurrent edit conflict, deletion confirmation, English
and Chinese, light/dark theme, and return to conversation. Disable the bundle to
check that its sidebar entry and route are disposed. Delete your test memory
before finishing. A successful installation alone does not prove visual behavior.

## License

AGPL-3.0-or-later, matching Mory. The stylesheet and logo are the original assets
from this Mory repository, included under the same project license. The SVG keeps
the website's font fallback behavior; no font files are embedded or downloaded.
Source: https://github.com/illli-studio/mory.
