# Task Runtime Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted task runtime preferences for workspace/dev setup, render priority labels, preserve context vault folder hierarchy, and expose runtime controls on the task list.

**Architecture:** Extend the task schema with saved runtime-preference fields, then teach workspace/dev routes to read and persist them. The web app will render editable workspace/dev controls in task detail, derive a local context tree from saved files, and upgrade task rows with non-navigating runtime actions.

**Tech Stack:** Next.js App Router, React 19, Vitest, TaskHelm core repositories, local git/worktree helpers, SQLite migrations.

---

### Task 1: Persist Task Runtime Preferences In Core

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/models/task.ts`
- Modify: `packages/core/src/db/migrations/010_local_context_schema_cleanup.sql`
- Create: `packages/core/src/db/migrations/011_task_runtime_preferences.sql`
- Test: `packages/core/tests/models/task.test.ts`
- Test: `packages/core/tests/db/migrate.test.ts`

- [ ] **Step 1: Write the failing tests for new task fields**

Add assertions in `packages/core/tests/models/task.test.ts` and `packages/core/tests/db/migrate.test.ts` for:
- persisted `workspace_name`
- persisted `workspace_branch`
- persisted `workspace_subrepo_branches_json`
- persisted `preferred_port`

- [ ] **Step 2: Run the focused core tests to verify failure**

Run: `pnpm exec vitest run tests/models/task.test.ts tests/db/migrate.test.ts`
Expected: FAIL because the new task fields and migration do not exist yet.

- [ ] **Step 3: Add the new fields to the task type, repository, and migration**

Update the task schema and repository mapping so create/update/findById all round-trip the new fields. Add `011_task_runtime_preferences.sql` to append the new columns for existing databases.

- [ ] **Step 4: Run the focused core tests to verify pass**

Run: `pnpm exec vitest run tests/models/task.test.ts tests/db/migrate.test.ts`
Expected: PASS.

### Task 2: Add Priority Label Utility And Use It In Task Detail

**Files:**
- Create: `packages/web/src/lib/tasks/priority-label.ts`
- Test: `packages/web/src/lib/tasks/priority-label.test.ts`
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.test.tsx`

- [ ] **Step 1: Write the failing priority-label tests**

Add a focused utility test covering `1-5` and an unknown fallback value.

- [ ] **Step 2: Run the focused priority tests to verify failure**

Run: `pnpm exec vitest run 'src/lib/tasks/priority-label.test.ts' 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx'`
Expected: FAIL because the helper does not exist and task detail still renders the numeric value.

- [ ] **Step 3: Implement the label utility and switch the task detail card to use it**

Render `Critical/High/Normal/Low/Backlog` in the hero meta card instead of the numeric value.

- [ ] **Step 4: Run the focused priority tests to verify pass**

Run: `pnpm exec vitest run 'src/lib/tasks/priority-label.test.ts' 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx'`
Expected: PASS.

### Task 3: Add Workspace Discovery And Validation Helpers

**Files:**
- Create: `packages/web/src/lib/workspace/subrepo-discovery.ts`
- Create: `packages/web/src/lib/workspace/runtime-settings.ts`
- Test: `packages/web/src/lib/workspace/subrepo-discovery.test.ts`
- Test: `packages/web/src/lib/workspace/runtime-settings.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Cover:
- detecting nested `.git` repos under a project root
- excluding the root repo itself
- sorting by relative path
- validating workspace-name uniqueness within a project task set
- normalizing stale sub-repo overrides

- [ ] **Step 2: Run the focused helper tests to verify failure**

Run: `pnpm exec vitest run 'src/lib/workspace/subrepo-discovery.test.ts' 'src/lib/workspace/runtime-settings.test.ts'`
Expected: FAIL because the helpers do not exist yet.

- [ ] **Step 3: Implement the helper modules**

Create small pure helpers for:
- sub-repo discovery from filesystem
- workspace-name uniqueness checks within a project
- branch override normalization against detected sub-repos

- [ ] **Step 4: Run the focused helper tests to verify pass**

Run: `pnpm exec vitest run 'src/lib/workspace/subrepo-discovery.test.ts' 'src/lib/workspace/runtime-settings.test.ts'`
Expected: PASS.

### Task 4: Extend Workspace API To Save Settings And Initialize With Overrides

**Files:**
- Modify: `packages/web/src/app/api/tasks/[taskId]/workspace/route.ts`
- Create: `packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts`
- Modify: `packages/core/src/index.ts` if helper exports are needed

- [ ] **Step 1: Write the failing workspace route tests**

Cover:
- saving `workspace_name`, `workspace_branch`, and `workspace_subrepo_branches_json`
- rejecting duplicate workspace names within the same project
- preserving saved settings on cleanup
- creating a worktree path derived from the saved workspace name

- [ ] **Step 2: Run the workspace route tests to verify failure**

Run: `pnpm exec vitest run 'src/app/api/tasks/[taskId]/workspace/route.test.ts'`
Expected: FAIL because the route does not parse request settings or persist them yet.

- [ ] **Step 3: Implement the route changes**

Update the route to:
- parse request JSON
- validate unique workspace name
- detect sub-repos
- persist saved settings on the task
- use the saved workspace name/branch when initializing
- keep saved settings when cleaning up runtime state

- [ ] **Step 4: Run the workspace route tests to verify pass**

Run: `pnpm exec vitest run 'src/app/api/tasks/[taskId]/workspace/route.test.ts'`
Expected: PASS.

### Task 5: Extend Dev API For Preferred Port Persistence

**Files:**
- Modify: `packages/web/src/app/api/tasks/[taskId]/dev/route.ts`
- Create: `packages/web/src/app/api/tasks/[taskId]/dev/route.test.ts`

- [ ] **Step 1: Write the failing dev route tests**

Cover:
- persisting `preferred_port`
- using the preferred port when available
- returning a clear error if the preferred port is unavailable
- preserving `preferred_port` after stop

- [ ] **Step 2: Run the dev route tests to verify failure**

Run: `pnpm exec vitest run 'src/app/api/tasks/[taskId]/dev/route.test.ts'`
Expected: FAIL because the route does not accept or persist preferred ports yet.

- [ ] **Step 3: Implement the dev route changes**

Update start/stop behavior to use saved preferred port semantics without silently falling back when an explicit port was requested.

- [ ] **Step 4: Run the dev route tests to verify pass**

Run: `pnpm exec vitest run 'src/app/api/tasks/[taskId]/dev/route.test.ts'`
Expected: PASS.

### Task 6: Build Task Detail Workspace And Dev Settings UI

**Files:**
- Modify: `packages/web/src/components/workspace-panel.tsx`
- Modify: `packages/web/src/components/dev-server-panel.tsx`
- Create: `packages/web/src/components/workspace-panel.test.tsx`
- Create: `packages/web/src/components/dev-server-panel.test.tsx`
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx` if additional props are required

- [ ] **Step 1: Write the failing component tests**

Cover:
- editable workspace name, main branch, and detected sub-repo branch fields
- duplicate-name validation error rendering
- editable preferred port field
- saved values rendered from task state

- [ ] **Step 2: Run the focused component tests to verify failure**

Run: `pnpm exec vitest run 'src/components/workspace-panel.test.tsx' 'src/components/dev-server-panel.test.tsx'`
Expected: FAIL because these controls do not exist yet.

- [ ] **Step 3: Implement the minimal UI and request wiring**

Update the panels to:
- render persisted settings
- submit JSON payloads to workspace/dev routes
- refresh the page on success
- keep error rendering local to each panel

- [ ] **Step 4: Run the focused component tests to verify pass**

Run: `pnpm exec vitest run 'src/components/workspace-panel.test.tsx' 'src/components/dev-server-panel.test.tsx'`
Expected: PASS.

### Task 7: Render Context Vault As A Tree

**Files:**
- Create: `packages/web/src/lib/context-vault/tree.ts`
- Create: `packages/web/src/lib/context-vault/tree.test.ts`
- Modify: `packages/web/src/components/context-file-list.tsx`
- Modify: `packages/web/src/components/task-detail-panels.test.tsx`

- [ ] **Step 1: Write the failing context-tree tests**

Cover:
- grouping files by folder segments
- stable sorting of folders and files
- rendering nested folders while preserving file selection

- [ ] **Step 2: Run the focused context-tree tests to verify failure**

Run: `pnpm exec vitest run 'src/lib/context-vault/tree.test.ts' 'src/components/task-detail-panels.test.tsx'`
Expected: FAIL because the list is still flat.

- [ ] **Step 3: Implement the tree builder and tree list rendering**

Add a small tree utility and render collapsible folders in `ContextFileList`, keeping `onSelect` behavior unchanged for files.

- [ ] **Step 4: Run the focused context-tree tests to verify pass**

Run: `pnpm exec vitest run 'src/lib/context-vault/tree.test.ts' 'src/components/task-detail-panels.test.tsx'`
Expected: PASS.

### Task 8: Upgrade Task List Rows With Runtime Metadata And Actions

**Files:**
- Modify: `packages/web/src/components/task-row.tsx`
- Modify: `packages/web/src/app/projects/[slug]/page.tsx`
- Create: `packages/web/src/components/task-row.test.tsx`
- Reuse: `packages/web/src/components/delete-confirm.tsx`

- [ ] **Step 1: Write the failing task-row tests**

Cover:
- rendering workspace name, branch label, and port metadata
- rendering `Start` when not running and `Stop` when running
- rendering `Delete`
- action buttons not navigating to task detail

- [ ] **Step 2: Run the focused task-row tests to verify failure**

Run: `pnpm exec vitest run 'src/components/task-row.test.tsx'`
Expected: FAIL because the row does not yet expose these controls.

- [ ] **Step 3: Implement the richer task-row actions**

Update task rows to render runtime metadata and actions while preserving row navigation on non-action areas.

- [ ] **Step 4: Run the focused task-row tests to verify pass**

Run: `pnpm exec vitest run 'src/components/task-row.test.tsx'`
Expected: PASS.

### Task 9: Run Integration-Focused Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the targeted web test suite**

Run:
`pnpm exec vitest run 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' 'src/components/task-detail-panels.test.tsx' 'src/components/workspace-panel.test.tsx' 'src/components/dev-server-panel.test.tsx' 'src/components/task-row.test.tsx' 'src/app/api/tasks/[taskId]/workspace/route.test.ts' 'src/app/api/tasks/[taskId]/dev/route.test.ts' 'src/lib/context-vault/tree.test.ts' 'src/lib/tasks/priority-label.test.ts'`

Expected: PASS.

- [ ] **Step 2: Run the targeted core test suite**

Run:
`pnpm exec vitest run tests/models/task.test.ts tests/db/migrate.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:
`pnpm run typecheck`

Expected: PASS.

- [ ] **Step 4: Review changed files**

Review for:
- immutable state updates in React components
- task-route validation and error handling
- safe worktree naming and duplicate checks
- action buttons preventing accidental navigation in task rows

