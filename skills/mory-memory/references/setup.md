# Connect Mory

The skill requires a local Mory service and an assistant with Mory MCP tools.
The hosted web app stores browser data separately; installing this skill does
not give an assistant access to that browser's IndexedDB or GitHub/Gitee sync.

## Local runtime

With Node.js 22.18 or newer installed:

```sh
npm install -g @illli-studio/mory
mory init
mory start --background
mory mcp --check
```

`mory status` reports local service status. `mory doctor` provides diagnostics.
Default data lives in `~/.mory`; `MORY_HOME` can select a different directory.
Use the same directory for the service and MCP process.

## Assistant connection

Configure the assistant's MCP server using its supported configuration format.
For clients accepting `mcpServers` JSON:

```json
{
  "mcpServers": {
    "mory": {
      "command": "mory",
      "args": ["mcp"]
    }
  }
}
```

Other clients may require different syntax. The executable is `mory`, with
argument `mcp`; do not paste JSON into a configuration that expects TOML.
Reconnect/reload the assistant after setup. Verify that it exposes
`mory_search` and the other Mory tools before trying a memory operation.

For a separately managed API, configure `MORY_API_URL` and `MORY_API_TOKEN` in
the MCP process environment. Keep tokens out of chat, skill files and commits.
Do not replace unrelated MCP configuration.

If the executable is missing from the assistant's PATH, use the installed
executable's absolute path. If health checks fail, check that the service is
running and that both processes use the same API URL and configuration.

## Existing web memories

Export memories from the browser UI, then import the exported JSON into the
running local service:

```sh
mory import ./mory-export.json
```

This is a migration step, not automatic ongoing synchronization between the
hosted browser and local service. Check imported records before relying on them.
