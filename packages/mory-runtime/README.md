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

The same package also exports the TypeScript client:

```ts
import { MoryClient } from "@illli-studio/mory/client";
```
