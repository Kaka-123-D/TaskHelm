# Remove Task Status And Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `status` and `phase` from tasks across TaskHelm so tasks become local-first work units without workflow-state labeling.

**Architecture:** Start at the core type and schema layer so TypeScript and failing tests surface all remaining callers. Then clean the web API and UI, followed by CLI and docs, while leaving runtime-specific states such as `dev_server_state` untouched.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, SQLite migrations, Commander CLI

---

## File Map

### Core

- Modify: `packages/core/src/types.ts`
  Remove `TaskStatusValue`, `Task.status`, and `Task.phase`.
- Modify: `packages/core/src/models/task.ts`
  Stop reading/writing `status` and `phase`; remove `updateStatus`.
- Modify: `packages/core/src/capsule/schema.ts`
  Remove task status/phase fields from capsule schema.
- Modify: `packages/core/src/capsule/writer.ts`
  Stop emitting status/phase into capsule metadata.
- Create: `packages/core/src/db/migrations/012_remove_task_status_and_phase.sql`
  Rewrite `tasks` table without `status` and `phase`.
- Modify: `packages/core/src/index.ts`
  Stop exporting removed status types/helpers.
- Modify: `packages/core/tests/models/task.test.ts`
- Modify: `packages/core/tests/db/migrate.test.ts`
- Modify: `packages/core/tests/capsule/schema.test.ts`
- Modify: `packages/core/tests/capsule/writer.test.ts`

### Web API

- Modify: `packages/web/src/app/api/tasks/route.ts`
  Remove `status` query filtering.
- Modify: `packages/web/src/app/api/tasks/[taskId]/route.ts`
  Remove status mutation path from PATCH.
- Modify: `packages/web/src/lib/api-client.ts`
  Remove status parameter from task fetch helper.
- Modify: `packages/web/src/app/api/tasks/[taskId]/route.test.ts`
- Modify: `packages/web/src/app/api/tasks/route.test.ts` if present or create route-level coverage as needed

### Web UI

- Modify: `packages/web/src/components/task-list.tsx`
  Remove status pills/filter state.
- Modify: `packages/web/src/components/task-row.tsx`
  Remove task status dot/badge rendering.
- Modify: `packages/web/src/app/projects/[slug]/page.tsx`
  Remove status-derived counts/copy.
- Modify: `packages/web/src/app/page.tsx`
  Remove status-derived project summary counts if still present.
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`
  Remove task status badge in hero.
- Modify: `packages/web/src/components/create-task-form.tsx`
  Remove phase/status inputs and payload fields.
- Modify: `packages/web/src/components/edit-task-form.tsx`
  Remove phase/status inputs and payload fields.
- Modify: `packages/web/src/app/globals.css`
  Remove styles only used by task status pills if now dead.
- Modify: `packages/web/src/components/task-row.test.tsx`
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.test.tsx`
- Modify: `packages/web/src/app/page.test.tsx`
- Modify/create: `packages/web/src/components/task-list.test.tsx` if needed

### CLI

- Modify: `packages/cli/src/commands/task.ts`
  Remove `--status` option and status filtering.
- Modify: `packages/cli/src/formatters/table.ts`
  Remove task status/phase columns and detail rows.
- Modify: `packages/cli/tests/commands/project.test.ts`
- Modify/create: `packages/cli/tests/commands/task.test.ts`

### Docs

- Modify: `README.md`
- Modify: `docs/06-domain-model.md`
- Modify: `docs/07-sqlite-schema.md`
- Modify any other docs that still describe task status/phase as a task concept.

## Task 1: Remove Task Status And Phase From Core Types And Repository

**Files:**
- Create: `packages/core/src/db/migrations/012_remove_task_status_and_phase.sql`
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/models/task.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/models/task.test.ts`
- Test: `packages/core/tests/db/migrate.test.ts`

- [ ] **Step 1: Write the failing repository and migration tests**

Update `packages/core/tests/models/task.test.ts` so created and updated tasks no longer expect `status` or `phase`, and update `packages/core/tests/db/migrate.test.ts` so the `tasks` table schema no longer includes those columns.

Example expectations to add/update:

```ts
expect(task).not.toHaveProperty('status')
expect(task).not.toHaveProperty('phase')
expect(columns).not.toContain('status')
expect(columns).not.toContain('phase')
expect(migrationFiles.at(-1)).toBe('012_remove_task_status_and_phase.sql')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/models/task.test.ts tests/db/migrate.test.ts`

Expected: FAIL because `Task` and `tasks` schema still include `status` and `phase`.

- [ ] **Step 3: Write the migration and minimal repository changes**

Implement the table rewrite migration in `packages/core/src/db/migrations/012_remove_task_status_and_phase.sql`:

```sql
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT,
  title TEXT NOT NULL,
  goal TEXT,
  source_type TEXT,
  source_ref TEXT,
  priority INTEGER NOT NULL DEFAULT 3,
  branch_name TEXT,
  workspace_name TEXT,
  workspace_branch TEXT,
  workspace_subrepo_branches_json TEXT,
  preferred_port INTEGER,
  worktree_path TEXT,
  port INTEGER,
  dev_server_state TEXT,
  context_vault_root_path TEXT,
  context_vault_sources_json TEXT,
  context_vault_files_json TEXT,
  context_vault_selected_file TEXT,
  current_agent_run_id TEXT,
  latest_blocker TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Copy surviving columns, drop/rename the old table, and recreate remaining indexes.

In `packages/core/src/types.ts` and `packages/core/src/models/task.ts`, remove:

```ts
status: TaskStatusValue
phase: string
```

and remove `updateStatus`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/models/task.test.ts tests/db/migrate.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/db/migrations/012_remove_task_status_and_phase.sql packages/core/src/types.ts packages/core/src/models/task.ts packages/core/src/index.ts packages/core/tests/models/task.test.ts packages/core/tests/db/migrate.test.ts
git commit -m "refactor(core): remove task status and phase"
```

## Task 2: Remove Status And Phase From Capsule Schema

**Files:**
- Modify: `packages/core/src/capsule/schema.ts`
- Modify: `packages/core/src/capsule/writer.ts`
- Test: `packages/core/tests/capsule/schema.test.ts`
- Test: `packages/core/tests/capsule/writer.test.ts`

- [ ] **Step 1: Write the failing capsule tests**

Update capsule tests so they assert new capsule output omits `status` and `phase`.

Add assertions such as:

```ts
expect(parsed).not.toHaveProperty('status')
expect(parsed).not.toHaveProperty('phase')
expect(writtenTask).not.toHaveProperty('status')
expect(writtenTask).not.toHaveProperty('phase')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/capsule/schema.test.ts tests/capsule/writer.test.ts`

Expected: FAIL because the schema and writer still emit status/phase.

- [ ] **Step 3: Write the minimal capsule cleanup**

Remove task workflow fields from the schema and writer.

Delete schema entries like:

```ts
status: z.enum([...]),
phase: z.string(),
```

and remove writer fields like:

```ts
status: task.status,
phase: task.phase,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/capsule/schema.test.ts tests/capsule/writer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/capsule/schema.ts packages/core/src/capsule/writer.ts packages/core/tests/capsule/schema.test.ts packages/core/tests/capsule/writer.test.ts
git commit -m "refactor(core): drop task workflow fields from capsules"
```

## Task 3: Remove Task Status Logic From Web API

**Files:**
- Modify: `packages/web/src/app/api/tasks/route.ts`
- Modify: `packages/web/src/app/api/tasks/[taskId]/route.ts`
- Modify: `packages/web/src/lib/api-client.ts`
- Test: `packages/web/src/app/api/tasks/[taskId]/route.test.ts`
- Test: `packages/web/src/app/api/tasks/route.test.ts` or create it if missing

- [ ] **Step 1: Write the failing API tests**

Add/adjust tests so:

- `GET /api/tasks?status=ready` no longer filters by status
- `PATCH /api/tasks/[taskId]` no longer accepts or applies `status`

Example assertions:

```ts
expect(responseTasks).toHaveLength(allTasks.length)
expect(updatedTask).not.toHaveProperty('status')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run 'src/app/api/tasks/route.test.ts' 'src/app/api/tasks/[taskId]/route.test.ts'`

Expected: FAIL because the routes still read/write task status.

- [ ] **Step 3: Write the minimal API cleanup**

Remove status handling from:

```ts
const status = searchParams.get('status')
if (status) tasks = tasks.filter(...)
```

and remove the status branch from:

```ts
if (body.status !== undefined) {
  taskRepo.updateStatus(taskId, body.status)
}
```

Also simplify `fetchTasks(projectId, status?)` to `fetchTasks(projectId)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run 'src/app/api/tasks/route.test.ts' 'src/app/api/tasks/[taskId]/route.test.ts'`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/api/tasks/route.ts packages/web/src/app/api/tasks/[taskId]/route.ts packages/web/src/lib/api-client.ts packages/web/src/app/api/tasks/route.test.ts packages/web/src/app/api/tasks/[taskId]/route.test.ts
git commit -m "refactor(web): remove task status api handling"
```

## Task 4: Remove Status And Phase From Task Forms And Task Surfaces

**Files:**
- Modify: `packages/web/src/components/create-task-form.tsx`
- Modify: `packages/web/src/components/edit-task-form.tsx`
- Modify: `packages/web/src/components/task-list.tsx`
- Modify: `packages/web/src/components/task-row.tsx`
- Modify: `packages/web/src/app/projects/[slug]/page.tsx`
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`
- Modify: `packages/web/src/app/page.tsx`
- Modify: `packages/web/src/app/globals.css`
- Test: `packages/web/src/components/task-row.test.tsx`
- Test: `packages/web/src/components/task-list.test.tsx`
- Test: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.test.tsx`
- Test: `packages/web/src/app/page.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

Update/create tests so they assert:

- task list no longer renders `All / Draft / Ready / ...`
- task row no longer renders task status dot/badge
- task detail hero no longer renders task status badge
- create/edit forms no longer render `Status` or `Phase`

Useful assertions:

```ts
expect(markup).not.toContain('Draft')
expect(markup).not.toContain('Ready')
expect(markup).not.toContain('data-slot="status-badge"')
expect(markup).not.toContain('Status')
expect(markup).not.toContain('Phase')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run 'src/components/task-row.test.tsx' 'src/components/task-list.test.tsx' 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' 'src/app/page.test.tsx'`

Expected: FAIL because the UI still renders task workflow state.

- [ ] **Step 3: Write the minimal UI cleanup**

Remove task status/phase UI from the affected components.

Delete logic like:

```tsx
const filters = [...]
const filteredTasks = tasks.filter(t => t.status === filter)
<StatusDot status={task.status} />
<StatusBadge value={task.status} />
```

and remove form fields/payload entries like:

```tsx
status: form.status,
phase: form.phase,
<GlassSelect label="Status" ... />
<GlassSelect label="Phase" ... />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run 'src/components/task-row.test.tsx' 'src/components/task-list.test.tsx' 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' 'src/app/page.test.tsx'`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/create-task-form.tsx packages/web/src/components/edit-task-form.tsx packages/web/src/components/task-list.tsx packages/web/src/components/task-row.tsx packages/web/src/app/projects/[slug]/page.tsx packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx packages/web/src/app/page.tsx packages/web/src/app/globals.css packages/web/src/components/task-row.test.tsx packages/web/src/components/task-list.test.tsx packages/web/src/app/projects/[slug]/tasks/[taskId]/page.test.tsx packages/web/src/app/page.test.tsx
git commit -m "refactor(web): remove task workflow ui"
```

## Task 5: Remove Status And Phase From CLI

**Files:**
- Modify: `packages/cli/src/commands/task.ts`
- Modify: `packages/cli/src/formatters/table.ts`
- Test: `packages/cli/tests/commands/task.test.ts`
- Test: `packages/cli/tests/commands/project.test.ts`

- [ ] **Step 1: Write the failing CLI tests**

Add or update tests so:

- `task list --status` is no longer accepted
- task list table no longer includes `status` and `phase`
- task detail output no longer prints task status/phase rows

Example assertions:

```ts
expect(output).not.toContain('status')
expect(output).not.toContain('phase')
expect(commandHelp).not.toContain('--status')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/commands/task.test.ts tests/commands/project.test.ts`

Expected: FAIL because CLI still exposes task workflow state.

- [ ] **Step 3: Write the minimal CLI cleanup**

Remove code like:

```ts
.option('--status <status>', 'Filter by status')
tasks = tasks.filter((t) => t.status === ...)
head: ['id', 'key', 'title', 'status', 'phase', 'branch', 'port']
['status', task.status]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/commands/task.test.ts tests/commands/project.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/task.ts packages/cli/src/formatters/table.ts packages/cli/tests/commands/task.test.ts packages/cli/tests/commands/project.test.ts
git commit -m "refactor(cli): remove task workflow state"
```

## Task 6: Clean Docs And Run Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/06-domain-model.md`
- Modify: `docs/07-sqlite-schema.md`
- Modify other docs that still mention task status/phase as product concepts

- [ ] **Step 1: Update docs to match the new task model**

Remove descriptions of task workflow states and replace them with task fields that still exist.

Use edits like:

```md
- Task: title, goal, source metadata, priority, context vault, workspace runtime
```

and remove text like:

```md
- Task status: draft, ready, running, blocked, done
- Task phase: context, implementation, review
```

- [ ] **Step 2: Run targeted package verification**

Run:

```bash
pnpm exec vitest run tests/models/task.test.ts tests/db/migrate.test.ts tests/capsule/schema.test.ts tests/capsule/writer.test.ts
pnpm exec vitest run 'src/app/api/tasks/route.test.ts' 'src/app/api/tasks/[taskId]/route.test.ts' 'src/components/task-row.test.tsx' 'src/components/task-list.test.tsx' 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' 'src/app/page.test.tsx'
pnpm exec vitest run tests/commands/task.test.ts tests/commands/project.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run typecheck and build**

Run:

```bash
pnpm run typecheck --filter @taskhelm/web
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run GitNexus change detection**

Run change detection and confirm only expected task/core/web/cli/doc areas are touched.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/06-domain-model.md docs/07-sqlite-schema.md
git commit -m "docs: remove task workflow terminology"
```

## Self-Review

- Spec coverage:
  - core type/schema/repository removal: Tasks 1-2
  - API removal: Task 3
  - UI/forms/list/detail cleanup: Task 4
  - CLI removal: Task 5
  - docs/final verification: Task 6
- Placeholder scan:
  - no `TBD/TODO`, each task has explicit files, commands, and concrete code snippets
- Type consistency:
  - the plan consistently removes `status`, `phase`, and `updateStatus`, while keeping `dev_server_state`
