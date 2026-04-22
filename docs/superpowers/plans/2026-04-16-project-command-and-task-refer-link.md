# Project Command And Task Refer Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `test_command`, replace task `source_type/source_ref` with optional `refer_link`, and surface the link on task detail.

**Architecture:** Apply the cleanup from the schema upward: rewrite SQLite tables first, then align core types and repositories, then update web forms/routes/detail UI, and finally scrub docs/tests that still mention the removed fields. Keep validation duplicated at the API boundary and form boundary so malformed links are rejected before persistence.

**Tech Stack:** SQLite migrations, TypeScript core repositories, Next.js app routes and React forms, Vitest.

---

### Task 1: Rewrite The Database Schema

**Files:**
- Create: `packages/core/src/db/migrations/013_project_command_and_task_refer_link_cleanup.sql`
- Modify: `packages/core/tests/db/migrate.test.ts`

- [ ] **Step 1: Write the failing migration test**

Add assertions in `packages/core/tests/db/migrate.test.ts` that the final schema:

```ts
expect(projectColumns).not.toContain('test_command')
expect(taskColumns).not.toContain('source_type')
expect(taskColumns).not.toContain('source_ref')
expect(taskColumns).toContain('refer_link')
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir packages/core exec vitest run tests/db/migrate.test.ts
```

Expected: FAIL because the schema still contains `test_command`, `source_type`, and `source_ref`, and does not yet contain `refer_link`.

- [ ] **Step 3: Write the migration**

Create `packages/core/src/db/migrations/013_project_command_and_task_refer_link_cleanup.sql` by following the existing table-rewrite pattern from migrations `010` and `012`:

```sql
CREATE TABLE projects_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  local_repo_root TEXT NOT NULL,
  default_branch TEXT,
  branch_naming_pattern TEXT,
  worktree_root TEXT,
  dev_command TEXT,
  install_command TEXT,
  max_active_dev_servers INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO projects_new (
  id, name, slug, description, local_repo_root, default_branch,
  branch_naming_pattern, worktree_root, dev_command, install_command,
  max_active_dev_servers, created_at, updated_at
)
SELECT
  id, name, slug, description, local_repo_root, default_branch,
  branch_naming_pattern, worktree_root, dev_command, install_command,
  max_active_dev_servers, created_at, updated_at
FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  key TEXT,
  title TEXT NOT NULL,
  goal TEXT,
  refer_link TEXT,
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
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

INSERT INTO tasks_new (
  id, project_id, key, title, goal, refer_link, priority, branch_name,
  workspace_name, workspace_branch, workspace_subrepo_branches_json,
  preferred_port, worktree_path, port, dev_server_state,
  context_vault_root_path, context_vault_sources_json, context_vault_files_json,
  context_vault_selected_file, current_agent_run_id, latest_blocker,
  created_at, updated_at
)
SELECT
  id, project_id, key, title, goal, NULL, priority, branch_name,
  workspace_name, workspace_branch, workspace_subrepo_branches_json,
  preferred_port, worktree_path, port, dev_server_state,
  context_vault_root_path, context_vault_sources_json, context_vault_files_json,
  context_vault_selected_file, current_agent_run_id, latest_blocker,
  created_at, updated_at
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE UNIQUE INDEX idx_projects_slug ON projects(slug);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir packages/core exec vitest run tests/db/migrate.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/db/migrations/013_project_command_and_task_refer_link_cleanup.sql packages/core/tests/db/migrate.test.ts
git commit -m "chore: rewrite project and task schema for refer link"
```

### Task 2: Align Core Types, Repositories, And Capsule Serialization

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/models/project.ts`
- Modify: `packages/core/src/models/task.ts`
- Modify: `packages/core/src/capsule/writer.ts`
- Test: `packages/core/tests/models/project.test.ts`
- Test: `packages/core/tests/models/task.test.ts`
- Test: `packages/core/tests/capsule/writer.test.ts`
- Test: `packages/core/tests/capsule/reader.test.ts`

- [ ] **Step 1: Write the failing model and capsule tests**

Update tests to expect the new field shapes:

```ts
expect(project).not.toHaveProperty('test_command')
expect(task.refer_link).toBe('https://example.com/tickets/42')
expect(task).not.toHaveProperty('source_type')
expect(task).not.toHaveProperty('source_ref')
expect(parsed.referLink).toBe(baseTask.refer_link)
expect(parsed.source).toBeUndefined()
```

Update the task factory objects in tests so they use:

```ts
refer_link: 'https://example.com/tickets/42'
```

and remove:

```ts
test_command: 'pnpm test'
source_type: 'github_issue'
source_ref: 'https://github.com/org/repo/issues/1'
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir packages/core exec vitest run tests/models/project.test.ts tests/models/task.test.ts tests/capsule/writer.test.ts tests/capsule/reader.test.ts
```

Expected: FAIL because the core types and repositories still expose the removed fields.

- [ ] **Step 3: Write the minimal core implementation**

Apply these changes:

`packages/core/src/types.ts`

```ts
export interface Project {
  // remove test_command
}

export interface Task {
  readonly refer_link: string | null
  // remove source_type/source_ref
}
```

`packages/core/src/models/project.ts`

```ts
interface ProjectRow {
  // remove test_command
}

stmt.run({
  // stop reading/writing test_command
})
```

`packages/core/src/models/task.ts`

```ts
interface TaskRow {
  refer_link: string | null
}

function rowToTask(row: TaskRow): Task {
  return {
    // ...
    refer_link: row.refer_link,
  }
}

// create/update SQL
// replace source_type/source_ref with refer_link
```

`packages/core/src/capsule/writer.ts`

```ts
if (task.refer_link !== null) {
  capsule.referLink = task.refer_link
}

// remove source serialization block
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir packages/core exec vitest run tests/models/project.test.ts tests/models/task.test.ts tests/capsule/writer.test.ts tests/capsule/reader.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/models/project.ts packages/core/src/models/task.ts packages/core/src/capsule/writer.ts packages/core/tests/models/project.test.ts packages/core/tests/models/task.test.ts packages/core/tests/capsule/writer.test.ts packages/core/tests/capsule/reader.test.ts
git commit -m "refactor: replace task source fields with refer link"
```

### Task 3: Update Web API Validation And Payload Mapping

**Files:**
- Modify: `packages/web/src/app/api/projects/route.ts`
- Modify: `packages/web/src/app/api/projects/[slug]/route.ts`
- Modify: `packages/web/src/app/api/tasks/route.ts`
- Modify: `packages/web/src/app/api/tasks/[taskId]/route.ts`
- Test: `packages/web/src/app/api/projects/route.test.ts`
- Test: `packages/web/src/app/api/projects/[slug]/route.test.ts`
- Test: `packages/web/src/app/api/tasks/route.test.ts`
- Test: `packages/web/src/app/api/tasks/[taskId]/route.test.ts`

- [ ] **Step 1: Write the failing route tests**

Add assertions like:

```ts
expect(responseProject.test_command).toBeUndefined()
expect(responseTask.refer_link).toBe('https://example.com/tickets/42')
expect(responseTask.source_type).toBeUndefined()
expect(responseTask.source_ref).toBeUndefined()
```

Add invalid-link tests:

```ts
const response = await POST(new Request('http://localhost', {
  method: 'POST',
  body: JSON.stringify({ title: 'Ship auth', refer_link: 'not-a-url' }),
}))

expect(response.status).toBe(400)
await expect(response.json()).resolves.toMatchObject({
  error: 'Refer link must be a valid absolute URL',
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir packages/web exec vitest run src/app/api/projects/route.test.ts src/app/api/projects/[slug]/route.test.ts src/app/api/tasks/route.test.ts src/app/api/tasks/[taskId]/route.test.ts
```

Expected: FAIL because the routes still accept old fields and do not validate `refer_link`.

- [ ] **Step 3: Write the minimal route implementation**

In both task routes, add a shared normalization pattern like:

```ts
function normalizeReferLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  try {
    return new URL(value).toString()
  } catch {
    throw new Error('Refer link must be a valid absolute URL')
  }
}
```

Use it in create/update payloads:

```ts
const referLink = normalizeReferLink(body.refer_link)

taskRepo.create({
  title: body.title,
  goal: body.goal ?? null,
  refer_link: referLink,
  priority: body.priority,
})
```

Project routes should stop reading/writing `test_command` entirely.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir packages/web exec vitest run src/app/api/projects/route.test.ts src/app/api/projects/[slug]/route.test.ts src/app/api/tasks/route.test.ts src/app/api/tasks/[taskId]/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/api/projects/route.ts packages/web/src/app/api/projects/[slug]/route.ts packages/web/src/app/api/tasks/route.ts packages/web/src/app/api/tasks/[taskId]/route.ts packages/web/src/app/api/projects/route.test.ts packages/web/src/app/api/projects/[slug]/route.test.ts packages/web/src/app/api/tasks/route.test.ts packages/web/src/app/api/tasks/[taskId]/route.test.ts
git commit -m "feat: validate refer link in task routes"
```

### Task 4: Update Project And Task Forms

**Files:**
- Modify: `packages/web/src/components/create-project-form.tsx`
- Modify: `packages/web/src/components/edit-project-form.tsx`
- Modify: `packages/web/src/components/create-task-form.tsx`
- Modify: `packages/web/src/components/edit-task-form.tsx`
- Test: `packages/web/src/components/create-project-form.test.tsx`
- Test: `packages/web/src/components/edit-project-form.test.tsx`
- Test: `packages/web/src/components/create-task-form.test.tsx`
- Test: `packages/web/src/components/edit-task-form.test.tsx`

- [ ] **Step 1: Write the failing form tests**

Add assertions:

```ts
expect(markup).not.toContain('Test Command')
expect(markup).not.toContain('Source Type')
expect(markup).not.toContain('Source Ref')
expect(markup).toContain('Refer Link')
```

For submit payload tests, expect:

```ts
expect(fetchBody.refer_link).toBe('https://example.com/tickets/42')
expect(fetchBody.test_command).toBeUndefined()
expect(fetchBody.source_type).toBeUndefined()
expect(fetchBody.source_ref).toBeUndefined()
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir packages/web exec vitest run src/components/create-project-form.test.tsx src/components/edit-project-form.test.tsx src/components/create-task-form.test.tsx src/components/edit-task-form.test.tsx
```

Expected: FAIL because the forms still render or submit the old fields.

- [ ] **Step 3: Write the minimal form implementation**

Project forms:

```tsx
// remove testCommand from state
// remove body.test_command writes
```

Task forms:

```tsx
const [form, setForm] = useState({
  title: '',
  goal: '',
  referLink: '',
  priority: 3,
})

if (form.referLink.trim()) {
  body.refer_link = form.referLink.trim()
}
```

Render:

```tsx
<GlassInput
  label="Refer Link"
  placeholder="https://example.com/tickets/42"
  value={form.referLink}
  onChange={event => setForm(current => ({ ...current, referLink: event.target.value }))}
/>
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir packages/web exec vitest run src/components/create-project-form.test.tsx src/components/edit-project-form.test.tsx src/components/create-task-form.test.tsx src/components/edit-task-form.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/create-project-form.tsx packages/web/src/components/edit-project-form.tsx packages/web/src/components/create-task-form.tsx packages/web/src/components/edit-task-form.tsx packages/web/src/components/create-project-form.test.tsx packages/web/src/components/edit-project-form.test.tsx packages/web/src/components/create-task-form.test.tsx packages/web/src/components/edit-task-form.test.tsx
git commit -m "feat: simplify project and task forms"
```

### Task 5: Show Refer Link On Task Detail

**Files:**
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`
- Modify: `packages/web/src/components/task-detail-panels.tsx`
- Test: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.test.tsx`
- Test: `packages/web/src/components/task-detail-panels.test.tsx`

- [ ] **Step 1: Write the failing task detail tests**

Add assertions:

```ts
expect(markup).toContain('Refer Link')
expect(markup).toContain('href="https://example.com/tickets/42"')
expect(markup).toContain('target="_blank"')
expect(markup).toContain('rel="noreferrer"')
```

Add the empty-state counterpart:

```ts
expect(markup).not.toContain('Refer Link')
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir packages/web exec vitest run 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' src/components/task-detail-panels.test.tsx
```

Expected: FAIL because task detail does not render the new link block yet.

- [ ] **Step 3: Write the minimal detail implementation**

Render a compact block near the task summary or metadata:

```tsx
{task.refer_link ? (
  <div className="task-detail-link-row">
    <div className="task-pane-label">Refer Link</div>
    <a
      href={task.refer_link}
      target="_blank"
      rel="noreferrer"
      className="context-preview-link"
    >
      {task.refer_link}
    </a>
  </div>
) : null}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir packages/web exec vitest run 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' src/components/task-detail-panels.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx packages/web/src/components/task-detail-panels.tsx packages/web/src/app/projects/[slug]/tasks/[taskId]/page.test.tsx packages/web/src/components/task-detail-panels.test.tsx
git commit -m "feat: show refer link on task detail"
```

### Task 6: Update Remaining Fixtures, Runtime Helpers, And Docs

**Files:**
- Modify: `packages/web/src/lib/workspace/runtime-settings.test.ts`
- Modify: `packages/web/src/components/task-row.test.tsx`
- Modify: `packages/web/src/components/task-list.test.tsx`
- Modify: `packages/web/src/components/workspace-panel.test.tsx`
- Modify: `packages/web/src/components/project-card.test.tsx`
- Modify: `packages/web/src/components/project-card-menu.test.tsx`
- Modify: `README.md`
- Modify: `docs/06-domain-model.md`
- Modify: `docs/07-sqlite-schema.md`
- Modify: any remaining docs/examples found by `rg "test_command|source_type|source_ref"`

- [ ] **Step 1: Write the failing consistency/doc tests or searches**

First run the search and capture the remaining references:

```bash
rg -n "test_command|source_type|source_ref" packages/core packages/web README.md docs
```

Expected: references remain in tests, fixtures, and docs.

- [ ] **Step 2: Update fixtures and docs**

Apply the fixture cleanup consistently:

```ts
// remove test_command from project fixtures
// remove source_type/source_ref from task fixtures
// add refer_link: null where task factories need explicit shape
```

Update docs to describe:

```md
- projects no longer include `test_command`
- tasks use optional `refer_link`
```

- [ ] **Step 3: Run focused searches/tests to verify cleanup**

Run:

```bash
rg -n "test_command|source_type|source_ref" packages/core packages/web README.md docs
pnpm --dir packages/core exec vitest run tests/models/project.test.ts tests/models/task.test.ts tests/db/migrate.test.ts
pnpm --dir packages/web exec vitest run src/components/task-row.test.tsx src/components/task-list.test.tsx src/components/workspace-panel.test.tsx
```

Expected:
- `rg` only returns historical spec/plan docs that are intentionally preserved, or no matches in active code/docs.
- Tests PASS.

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm --dir packages/core exec vitest run tests/db/migrate.test.ts tests/models/project.test.ts tests/models/task.test.ts tests/capsule/writer.test.ts tests/capsule/reader.test.ts
pnpm --dir packages/web exec vitest run src/app/api/projects/route.test.ts src/app/api/projects/[slug]/route.test.ts src/app/api/tasks/route.test.ts src/app/api/tasks/[taskId]/route.test.ts src/components/create-project-form.test.tsx src/components/edit-project-form.test.tsx src/components/create-task-form.test.tsx src/components/edit-task-form.test.tsx 'src/app/projects/[slug]/tasks/[taskId]/page.test.tsx' src/components/task-detail-panels.test.tsx
pnpm --dir packages/web run typecheck
pnpm --dir packages/web run build
```

Expected: PASS.

- [ ] **Step 5: Detect scope and commit**

Run:

```bash
npx gitnexus detect-changes --scope all
git add README.md docs/06-domain-model.md docs/07-sqlite-schema.md packages/core packages/web
git commit -m "refactor: remove legacy project and task fields"
```

Expected: changed scope matches migration/core/web/docs for this cleanup.
