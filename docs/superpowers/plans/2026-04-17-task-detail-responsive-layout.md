# Task Detail Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the task detail screen responsive so the workspace panel moves above the context vault below `1536px`, while the file list auto-collapses into an icon rail only when the pane becomes too narrow.

**Architecture:** Keep the existing large-screen layout intact and scope the responsive work to task-detail layout CSS plus the context file list presentation. Use a width-aware mode inside `ContextFileList` to decide when the file tree should render as an icon rail, instead of driving that mode from viewport width alone.

**Tech Stack:** React, Next.js app router, CSS in `globals.css`, Vitest, Testing Library.

---

### Task 1: Add regression tests for responsive task-detail layout

**Files:**
- Modify: `packages/web/src/components/task-detail-panels.test.tsx`
- Modify: `packages/web/src/components/context-file-list.test.tsx`

- [ ] **Step 1: Add failing tests for laptop layout and icon-rail mode**

Extend the existing task detail and file list tests to assert:
- a laptop-width layout state moves the workspace panel section above the context vault region
- `ContextFileList` can enter a narrow icon-rail mode
- icon-rail items expose the file name via accessible label/title

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `pnpm --dir packages/web exec vitest run src/components/task-detail-panels.test.tsx src/components/context-file-list.test.tsx`
Expected: FAIL because the current layout and file list do not support these responsive behaviors yet.

### Task 2: Implement task-detail responsive reflow

**Files:**
- Modify: `packages/web/src/components/task-detail-panels.tsx`
- Modify: `packages/web/src/app/globals.css`

- [ ] **Step 1: Add structural hooks for responsive layout**

Update `TaskDetailPanels` markup with explicit wrappers/class hooks for:
- top utility/workspace region
- bottom context-vault region
- a stable region that remains desktop-side on `>=1536px`

- [ ] **Step 2: Implement the CSS breakpoint behavior**

Update `globals.css` so:
- `>=1536px` keeps the current two-column `task-detail-grid`
- `<1536px` stacks the workspace/dev area above the context vault
- context vault gets the full available width below
- no regression is introduced to existing desktop spacing and card shells

- [ ] **Step 3: Re-run the targeted task-detail tests**

Run: `pnpm --dir packages/web exec vitest run src/components/task-detail-panels.test.tsx`
Expected: PASS for the layout assertions.

### Task 3: Implement width-aware icon rail for the file list

**Files:**
- Modify: `packages/web/src/components/context-file-list.tsx`
- Modify: `packages/web/src/app/globals.css`

- [ ] **Step 1: Add minimal width-aware state**

Update `ContextFileList` so it can derive a presentation mode from the actual available pane width:
- full list when there is enough room
- icon rail when the pane becomes too narrow

- [ ] **Step 2: Implement icon-rail rendering**

In narrow mode:
- show only icon/type affordance in the rail
- keep folder/file selection working
- expose file/folder names via `title`, aria label, or equivalent accessible hover naming

- [ ] **Step 3: Keep full mode and folder hierarchy intact**

Ensure:
- folder tree structure stays intact in full mode
- folder expand/collapse behavior continues to work
- the preview pane gets priority width when the list collapses

- [ ] **Step 4: Re-run the targeted file-list tests**

Run: `pnpm --dir packages/web exec vitest run src/components/context-file-list.test.tsx`
Expected: PASS for icon-rail behavior and accessible naming.

### Task 4: Run build and type verification for the responsive patch

**Files:**
- No code changes required unless verification reveals regressions

- [ ] **Step 1: Run the focused responsive suite**

Run: `pnpm --dir packages/web exec vitest run src/components/task-detail-panels.test.tsx src/components/context-file-list.test.tsx src/app/projects/[slug]/tasks/[taskId]/page.test.tsx`
Expected: PASS

- [ ] **Step 2: Run package build and typecheck**

Run:
- `pnpm --dir packages/web run build`
- `pnpm --dir packages/web run typecheck`

Expected:
- web build passes
- web typecheck passes
