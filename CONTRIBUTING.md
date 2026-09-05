# Contributing to Mory

Mory is a local-first, open-source memory runtime. Contributions should
preserve user ownership, append-only history, and compatibility for agents.

Before opening a pull request:

1. Run `pnpm install`.
2. Run `pnpm build`.
3. Run `pnpm typecheck`.
4. Explain data-model or API changes in the pull request description.

Keep changes focused, avoid adding telemetry by default, and include a
migration or compatibility note when changing persisted data.

By contributing, you agree that your contribution is provided under the
project's AGPL-3.0-or-later license. If you are contributing on behalf of an
organization, make sure you have authority to do so.
