# Use Mory with an Agent Skill / 使用 Mory Skill

Mory MCP provides the tools to read and write memories. The `mory-memory` skill
teaches an assistant when to recall, save, correct, or forget them. Both are
needed for this workflow; a skill alone does not connect to your data.

MCP 提供读写记忆的工具，`mory-memory` skill 告诉 AI 什么时候检索、保存、
修订或删除记忆。安装 skill 后仍需连接本地 Mory MCP 服务。

## Install / 安装

1. Follow the [local service and MCP setup](../skills/mory-memory/references/setup.md).
   先安装并启动本地 Mory，再配置 AI 助手的 MCP 连接。
2. Download or clone this repository and copy the complete
   [`skills/mory-memory`](../skills/mory-memory) folder into your assistant's
   skill directory. Keep `SKILL.md` and `references/setup.md` together.
   下载或克隆仓库，将整个文件夹复制到助手的 skill 目录，保留其内部结构。
   For a Codex installation using `$CODEX_HOME/skills`, place it there;
   when `CODEX_HOME` is unset, the default is `~/.codex/skills/mory-memory/`.
   For other assistants, use their supported skill location.
3. Reload the assistant so it discovers the skill and MCP tools.
   重新加载助手，确认 skill 和 Mory 工具都已发现。

The repository includes the skill source; it is not currently installed by
`npm install -g @illli-studio/mory`.
仓库提供 skill 源文件；目前 npm 安装本地服务不会自动安装 skill。

## Try it / 试用

- “Use $mory-memory to remember that I prefer Chinese responses.”
  / “用 $mory-memory 记住：我偏好中文回复。”
- “Use $mory-memory to find the decisions we made for this project.”
  / “用 $mory-memory 查一下我们之前对这个项目做过的决定。”
- “Update my saved language preference to English.”
  / “把之前保存的语言偏好改成英文。”
- “Forget the saved language preference.”
  / “忘掉之前保存的语言偏好。”

Explicit invocation syntax varies by assistant. The skill can also be selected
automatically when the host supports it. It does not silently save all chats;
ongoing memory capture follows the user's chosen scope.
不同助手的显式调用方式可能不同；支持自动选择的助手也可按请求匹配此 skill。
它不会默认保存全部聊天；持续记录需遵循用户设定的范围。

Hosted web memories must first be exported and imported into the local service
to be available through this MCP connection. See the setup reference above.
网页版已有记忆需先导出、导入本地服务，当前 MCP 才能读取它们。
