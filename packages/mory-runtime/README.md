# Mory Runtime

Local-first memory runtime with a web console and a generic MCP server.

```bash
npm install -g @illli-studio/mory
mory init
mory --version
mory start
mory start --background
mory status
mory stop
mory export ./mory-export.json
mory import ./mory-export.json
```

For MCP clients, use `mory mcp` as a stdio server. Set `MORY_API_URL` and `MORY_API_TOKEN` when the API is managed separately.
Use `mory mcp --check` to diagnose the local API connection without starting the stdio protocol.

## Companion Agent Skill

The package includes `skills/mory-memory/`, which guides an assistant on when
to recall, save, correct, and forget memories through Mory MCP. Copy that entire
folder into your assistant's supported skill directory, then reload the assistant.
For a global npm install, run `npm root -g` to find the package directory; the
skill is under `@illli-studio/mory/skills/mory-memory/` inside it.
Skill installation is manual and still requires the MCP connection above.

The same package also exports the TypeScript client:

```ts
import { MoryClient } from "@illli-studio/mory/client";
```
