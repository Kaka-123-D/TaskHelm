# Remove Task Status And Phase

## Goal

Remove the `status` and `phase` concepts from TaskHelm entirely so a task becomes a simpler local-first work unit centered on:

- title
- goal/source metadata
- priority
- local context vault
- workspace settings/runtime
- dev server runtime

After this change, TaskHelm should no longer model or present task workflow states such as `draft`, `ready`, `running`, `blocked`, `done`, or `context/review` phases.

## Scope

This phase removes task status and phase across:

- core task types, repositories, migrations, capsule schema/writer
- web API routes that read or mutate task status
- web UI that filters, renders, or edits task status/phase
- CLI task listing/filtering and task detail formatting
- documentation and tests that still describe task status/phase as a task concept

This phase does **not** remove runtime state from:

- `dev_server_state`
- `branch_name`
- `worktree_path`
- `port`
- workspace preferences
- context vault metadata

Those remain first-class because they reflect real runtime state, not workflow labeling.

## Product Behavior

### Task Model

Each task keeps:

- `title`
- `goal`
- `source_type`
- `source_ref`
- `priority`
- workspace settings/runtime
- context vault fields
- agent/dev-server linkage

Each task no longer has:

- `status`
- `phase`

### Task Lists

Task lists no longer expose status filters.

Specifically:

- remove pills such as `All`, `Draft`, `Ready`, `Running`, `Blocked`, `Done`
- remove status-based counts
- keep list ordering and task navigation behavior
- keep runtime controls and runtime metadata shown on each row

### Task Detail

Task detail no longer shows task workflow status or phase.

Specifically:

- remove status badge from the hero
- remove any copy implying workflow state
- keep priority, workspace, branch, port, dev server state, and context vault sections

### Create/Edit Task

Task create/edit forms no longer allow editing status or phase.

The minimal task-editable fields become:

- title
- goal
- source metadata if already supported
- priority

### API

Task API no longer accepts or filters by status:

- `GET /api/tasks` no longer supports `?status=...`
- `PATCH /api/tasks/[taskId]` no longer updates task status

### CLI

CLI task commands no longer expose task-status filtering or status/phase display columns.

## Data Model Changes

### Core Types

Remove from `Task` and related type definitions:

- `TaskStatusValue`
- `status`
- `phase`

Any helper or formatter specific to task status/phase should also be removed.

### Repository Layer

`TaskRepository` should:

- stop reading/writing `status` and `phase`
- stop assigning default `draft/context` values on create
- remove `updateStatus`

Create and update code paths should remain additive for all remaining task fields.

### Capsule Schema

Capsule schema and writer should stop emitting task status and phase into capsule metadata.

Existing capsules with these fields are tolerated only as old data, but newly written capsules should omit them.

## Database Migration Strategy

This requires a table rewrite migration for `tasks`.

The migration should:

1. create a replacement `tasks_new` table without `status` and `phase`
2. copy existing rows, preserving all remaining fields
3. recreate relevant indexes except the removed `idx_tasks_status`
4. replace the old `tasks` table

The migration must preserve:

- task IDs
- foreign key relationships
- timestamps
- runtime/workspace/context-vault fields

## Web UI Changes

### Remove Status Components From Task Surfaces

From task list and task detail:

- remove `StatusBadge` usage for task workflow state
- remove `StatusDot` usage that reflects task status

Do not remove those components globally because they are still valid for dev server pool and other runtime entities.

### Project Detail Page

Project detail currently derives counts and filters from task status. Replace this with a simpler task index shell:

- headline/stat copy should no longer mention running/ready task counts
- task list should render all tasks directly
- optional summary may use total task count only

### Home / Project Summaries

Any project summary derived from task status should be simplified to:

- total task count
- runtime info if already available independently

No new derived replacement taxonomy should be introduced in this phase.

## CLI Changes

### Task List

Remove:

- `--status` option
- task list columns `status` and `phase`

Keep:

- task ID/key/title
- branch/runtime columns
- other local-runtime-relevant fields

### Task Show / Tables

Remove task status/phase rows from detail table output.

## Error Handling

The removal should be backward-safe for old persisted rows and old capsules:

- migration handles old DB rows by copying only surviving columns
- code should not throw when old capsule files still contain status/phase
- API should ignore missing status/phase entirely rather than try to coerce defaults

## Testing

Add or update tests for:

- core migration schema after removing `status` and `phase`
- `TaskRepository.create/update/find` without status/phase
- task API routes no longer filtering or mutating status
- task list/detail UI no longer rendering status filters or badges
- CLI output no longer includes status/phase columns or filter option

Verification for the implementation phase should include:

- targeted core tests
- targeted web tests
- targeted CLI tests
- `pnpm run typecheck` for affected packages
- `npm run build` at repo root

## Risks And Guardrails

### Main Risk

The highest risk is incomplete removal: leaving one route, test fixture, or formatter still expecting `task.status` or `task.phase`.

### Guardrails

- remove the fields at the core type level early so TypeScript surfaces remaining callers
- update tests alongside each slice
- treat dev-server `status` and review-gate/agent-run statuses as unrelated concepts and leave them intact

## Implementation Slices

1. Core schema/types/repository/capsule cleanup
2. Web API cleanup
3. Web task surfaces and forms cleanup
4. CLI cleanup
5. Docs/test cleanup and final verification
