# Mory Layout Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Mory web information architecture so the first screen makes the Capture → Search → Feed path obvious, while moving repository health and integrations into a clear secondary workspace without regressing web P0 behavior.

**Architecture:** Replace the current three-column dashboard composition with a focused command-center layout: a compact top rail, a dominant capture/search workspace, a feed section directly below, and a collapsible/secondary repository rail for Health, Collections, GitHub, and Connectors. Keep store APIs, IndexedDB behavior, sync behavior, import/export, and record-card components intact unless a layout-only prop is required.

**Tech Stack:** React 19, TypeScript, Vite, CSS, lucide-react, existing Zustand-like memory store.

---

### Task 1: Freeze the current P0 contract

**Files:**
- Inspect: `apps/web/src/app.tsx`
- Inspect: `apps/web/src/store.ts`
- Create: `docs/plans/2026-08-25-layout-rebuild-acceptance.md`

**Steps:**

1. Record the behaviors that must not change: create/edit/delete, IndexedDB persistence, Search/Filter/Feed, JSON import/export, GitHub pull/push feedback, and responsive no-overflow behavior.
2. Record the visual acceptance path: Capture appears before Search, Search before Feed, and secondary tools never compete with the primary path.
3. Use the acceptance notes as the review checklist for the implementation.

### Task 2: Define the new page skeleton

**Files:**
- Modify: `apps/web/src/app.tsx`

**Steps:**

1. Keep the existing data-loading and selection state in `App`.
2. Replace the current `workspace-layout` composition with explicit regions: `top-rail`, `primary-workspace`, `capture-stage`, `search-stage`, `feed-stage`, and `utility-rail`.
3. Place Capture and Search in the same primary column, with visible section labels and no competing side cards above them.
4. Place Feed immediately after Search in the DOM and keep the utility rail after the primary workspace for narrow-screen ordering.
5. Keep `SystemHealth`, `CollectionsPanel`, `GithubSyncCard`, and `ConnectorRail` as existing functional components, moving only their layout wrapper.

### Task 3: Make the primary path visually self-explanatory

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/styles.css`

**Steps:**

1. Add small numbered or labeled wayfinding for Capture, Search, and Feed without adding copy that competes with the input controls.
2. Give Capture one dominant action surface and keep record-type switching secondary within that surface.
3. Give Search a full-width command treatment with source and filter controls grouped as one search stage.
4. Give Feed a strong heading, result count, and utility actions that remain available without pushing the primary controls below the fold.
5. Preserve existing buttons, form labels, keyboard focus states, and error notices.

### Task 4: Rework the utility rail and responsive behavior

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/styles.css`

**Steps:**

1. Group Health, Collections, GitHub, and Connectors under a clearly secondary repository rail.
2. Add a compact rail heading so the purpose of the secondary area is obvious.
3. At widths up to 1120px, move the utility rail below Feed; do not allow it to interleave Capture, Search, or Feed.
4. At 680px and 320px, collapse controls to one column, preserve the Capture → Search → Feed order, and prevent horizontal overflow.
5. Keep sync notices in normal document flow so they cannot cover Capture or Search.

### Task 5: Add layout regression coverage

**Files:**
- Create: `apps/web/src/layout-contract.test.tsx`
- Modify: `apps/web/package.json` if a test script is needed

**Steps:**

1. Add a lightweight render contract that asserts Capture, Search, Feed, and the utility rail appear in the intended DOM order.
2. Add a store-level regression check that the layout refactor does not alter create, import, or sync entry points.
3. Run the test suite and fix only layout-contract failures; do not expand scope into P1 integrations.

### Task 6: Validate and ship the layout rebuild

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/styles.css`

**Steps:**

1. Run `pnpm typecheck`.
2. Run `pnpm build`.
3. Run `git diff --check`.
4. Manually verify the shared dev server at 320px and 680px: no overflow, Capture → Search → Feed → utility rail, and sync notices do not obscure primary controls.
5. Commit with `git commit -m "Rebuild Mory web layout around primary memory flow"`.
6. Push `main` only after the four acceptance checks pass, then report the commit and any remaining P1 items.
