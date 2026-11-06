---
name: Mory · 个人记忆库
tagline: 在 DSH 侧栏管理个人记忆，让 AI 检索与更新同一记忆库，支持 GitHub/Gitee 私有仓库同步
author: illli-studio
repo: https://github.com/illli-studio/mory
package: "@illli-studio/dsh-mory"
install: dsh plugin --profile web add @illli-studio/dsh-mory
categories: [memory, knowledge, integration]
useCases: [memory-context]
tags: [dsh, mory, memory, cordis, deepseek-harness]
stars: 8
forks: 0
license: AGPL-3.0-or-later
language: CSS
updatedAt: 2026-11-06
dshTarget: 0.2.1-rc.5
verification: L1
security: unverified
health: active
trust: unrated
---

## What it does

Mory adds a native personal-memory sidebar to DeepSeek Harness, backed by the same Mory repository that its agent tools use. Users can save and search notes, decisions, tasks, bookmarks and other records, then let the agent retrieve or update those records across conversations. Recall is available through explicit tool calls; the plugin does not automatically collect conversations or inject the whole repository into prompts.

This is a monorepo: the DSH plugin source and its full documentation are in [packages/dsh-mory](https://github.com/illli-studio/mory/tree/main/packages/dsh-mory), and the published package is [@illli-studio/dsh-mory](https://www.npmjs.com/package/@illli-studio/dsh-mory).

## Key features

- Native sidebar navigation, search, filters, pagination, and create/read/edit/delete dialogs with revision-conflict handling.
- Shared `mory_memory` and `mory_settings` tools use the same Host operations as the panel.
- English/Chinese interface, 25 themes scoped to the panel, and persisted language/appearance/connection preferences.
- GitHub/Gitee private-repository synchronization that preserves divergent records and deletion intent, with explicit partial-success reporting.
- Protected connection/health checks and Host-side credentials bound to the configured origin or provider.
- Optional debounced automatic backup after future memory changes through the plugin or its agent tool; disabled by default.

## Compatibility notes

Tested harness release: `0.2.1-rc.5`. The published 0.1.2 package declares `engines.dsh: ">=0.2.1-rc.5 <0.3.0"` and Node.js `>=22.18`. Earlier DSH releases are outside the supported range and have not been runtime-tested. Reproducible install:

```sh
dsh plugin --profile web add @illli-studio/dsh-mory@0.1.2
```

Replace `web` with the actual profile name, such as `desktop`. The command follows the documented DSH CLI syntax; the CLI executable was not on PATH in the submission environment. During development the plugin was installed through DSH's plugin manager, and native settings read/write and protected local-service health checks were exercised. The published npm tarball was separately installed in an isolated temporary consumer; all 45 shipped plugin tests and runtime syntax checks passed. These are maintainer checks, not verification levels assigned by AllDSH.

A running Mory service is required separately on the DSH host:

```sh
npm install -g @illli-studio/mory
mory init
mory start --background
```

The browser-only repository at `me.mory.cloud` is not automatically connected or imported. No additional MCP connection or paid endpoint is required by the plugin. Rendered layout was not checked with browser automation.

### Permission and credential surface

- The Host reads `MORY_HOME/config.json` (default `~/.mory/config.json`) for the Mory service address/token and writes plugin preferences and optional credentials to `MORY_HOME/dsh-plugin.json`, including transient lock/temp files. Advanced Host configuration can select another configuration path. Settings files are not an encrypted vault; host filesystem access controls apply.
- Memory operations go through the authenticated Mory API. The Mory service persists data in its configured SQLite database; the plugin does not open that database directly. Agent tools can read private-marked records: the privacy flag is a display flag, not an access boundary.
- Outbound requests target the configured Mory API (local HTTP by default; HTTPS for remote origins). Optional synchronization uses GitHub/Gitee APIs and needs the user's provider token and private repository. Stored token values are omitted from settings responses, and a local Mory credential is not implicitly forwarded to a remote origin.
- Synchronization uploads include private memories and tombstones. Saving settings or reading memories does not upload data. Automatic backup only runs after subsequent plugin/agent-tool mutations when explicitly enabled.
- The plugin runtime does not execute shell commands. Optional API/provider credentials belong to the installing user; no maintainer credential is bundled.

Stars, forks and primary language above were read from the GitHub API on 2026-11-06. The root LICENSE declares `AGPL-3.0-or-later`; GitHub's automatic license classifier currently returns `NOASSERTION`. Verification, security and trust defaults are left for the directory maintainers to assess. A listing is not an endorsement or a security guarantee.
