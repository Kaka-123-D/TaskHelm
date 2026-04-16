# Context Vault Tree And Workspace Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the task detail workbench so the local context vault is easier to browse and read, and workspace initialization handles base-branch creation, nested repos inside worktrees, and recovery flows explicitly.

**Architecture:** Keep the current local-first task detail page and extend it in place. The `Context Vault` changes stay in the tree/panel/preview components plus CSS, while the workspace changes are centered in the task workspace route and a small set of focused git/worktree helpers so the branching logic is testable without overloading the route handler.

**Tech Stack:** Next.js App Router, React, Vitest, `react-markdown`, `remark-gfm`, `mermaid`, Node `fs/path/child_process`, TaskHelm core workspace helpers.

---

## File Structure

### Existing files to modify

- `packages/web/src/components/context-file-list.tsx`
  Responsibility: render the left-hand context vault tree and sidebar collapse control.
- `packages/web/src/components/context-file-preview.tsx`
  Responsibility: render markdown, text, and image previews in the right pane.
- `packages/web/src/components/task-detail-panels.tsx`
  Responsibility: own the split-pane state and pass file tree UI state down.
- `packages/web/src/app/globals.css`
  Responsibility: tree row, split-pane, and markdown preview presentation rules.
- `packages/web/src/components/workspace-panel.tsx`
  Responsibility: task detail workspace settings form and user-facing recovery state.
- `packages/web/src/app/api/tasks/[taskId]/workspace/route.ts`
  Responsibility: validate workspace init input, create or attach worktrees, and persist runtime settings.
- `packages/web/src/lib/workspace/git-branch.ts`
  Responsibility: branch checkout/create orchestration for the route layer.
- `packages/core/src/workspace/branch.ts`
  Responsibility: low-level branch existence and branch creation helpers reused by web and CLI.
- `packages/core/src/workspace/worktree.ts`
  Responsibility: low-level worktree creation reused by web and CLI.

### Existing tests to modify

- `packages/web/src/components/context-file-list.test.tsx`
- `packages/web/src/components/context-file-preview.test.tsx`
- `packages/web/src/components/task-detail-panels.test.tsx`
- `packages/web/src/components/workspace-panel.test.tsx`
- `packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts`
- `packages/core/tests/workspace/branch.test.ts`
- `packages/core/tests/workspace/worktree.test.ts`

### New files to create

- `packages/web/src/lib/context-vault/tree-state.ts`
  Responsibility: derive initial expanded folder set and normalize tree expansion after refresh.
- `packages/web/src/lib/context-vault/tree-state.test.ts`
  Responsibility: verify expansion defaults and selected-file ancestry behavior.
- `packages/web/src/lib/workspace/nested-worktree.ts`
  Responsibility: materialize nested repos inside a root worktree and checkout or create nested branches there.
- `packages/web/src/lib/workspace/nested-worktree.test.ts`
  Responsibility: verify nested repo copy/materialization and nested branch switching.
- `packages/web/src/lib/workspace/base-branch.ts`
  Responsibility: root repo base-branch preparation, auto-pull, and forced-refresh recovery.
- `packages/web/src/lib/workspace/base-branch.test.ts`
  Responsibility: verify branch list discovery, auto-pull, and force-refresh behavior.

## Task 1: Tighten Context Vault Tree UX

**Files:**
- Create: `packages/web/src/lib/context-vault/tree-state.ts`
- Test: `packages/web/src/lib/context-vault/tree-state.test.ts`
- Modify: `packages/web/src/components/context-file-list.tsx`
- Test: `packages/web/src/components/context-file-list.test.tsx`
- Modify: `packages/web/src/components/task-detail-panels.tsx`
- Test: `packages/web/src/components/task-detail-panels.test.tsx`
- Modify: `packages/web/src/app/globals.css`

- [ ] **Step 1: Write the failing tree-state tests**

```ts
import { describe, expect, it } from 'vitest'
import { createInitialExpandedFolders, ensureSelectedFileFoldersExpanded } from './tree-state'

describe('createInitialExpandedFolders', () => {
  it('expands root folders and selected-file ancestors while leaving unrelated nested folders collapsed', () => {
    const expanded = createInitialExpandedFolders(
      ['docs', 'docs/api', 'docs/api/images', 'notes'],
      'docs/api/guide.md',
    )

    expect([...expanded]).toEqual(['docs', 'docs/api'])
  })
})

describe('ensureSelectedFileFoldersExpanded', () => {
  it('re-opens ancestor folders after polling refresh', () => {
    const expanded = ensureSelectedFileFoldersExpanded(new Set(['docs']), 'docs/api/guide.md')
    expect([...expanded]).toEqual(['docs', 'docs/api'])
  })
})
```

- [ ] **Step 2: Run the new tree-state tests to verify they fail**

Run: `pnpm exec vitest run packages/web/src/lib/context-vault/tree-state.test.ts`

Expected: FAIL with module-not-found or missing export errors for `tree-state.ts`.

- [ ] **Step 3: Write the minimal tree-state helper**

```ts
function parentFolders(relativePath: string): string[] {
  const segments = relativePath.split('/').filter(Boolean)
  const parents: string[] = []

  for (let index = 0; index < segments.length - 1; index += 1) {
    parents.push(segments.slice(0, index + 1).join('/'))
  }

  return parents
}

export function createInitialExpandedFolders(
  folderPaths: readonly string[],
  selectedFile: string | null,
): ReadonlySet<string> {
  const expanded = new Set<string>(
    folderPaths.filter(folderPath => !folderPath.includes('/')),
  )

  if (selectedFile) {
    for (const folderPath of parentFolders(selectedFile)) {
      expanded.add(folderPath)
    }
  }

  return expanded
}

export function ensureSelectedFileFoldersExpanded(
  expandedFolders: ReadonlySet<string>,
  selectedFile: string | null,
): ReadonlySet<string> {
  const next = new Set(expandedFolders)
  if (selectedFile) {
    for (const folderPath of parentFolders(selectedFile)) {
      next.add(folderPath)
    }
  }
  return next
}
```

- [ ] **Step 4: Run the tree-state tests to verify they pass**

Run: `pnpm exec vitest run packages/web/src/lib/context-vault/tree-state.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing component tests for icon collapse and folder toggle behavior**

```ts
it('renders an icon-only collapse control', () => {
  const markup = renderToStaticMarkup(
    <ContextFileList
      files={files}
      selectedFile="docs/context.md"
      onSelect={() => {}}
      onToggleCollapse={() => {}}
      collapsed={false}
    />,
  )

  expect(markup).toContain('aria-label="Collapse file list"')
  expect(markup).not.toContain('Collapse list')
})

it('renders folders as toggleable rows and hides children while collapsed', () => {
  const markup = renderToStaticMarkup(
    <ContextFileList
      files={[
        file('docs/context.md'),
        file('docs/images/diagram.png'),
      ]}
      selectedFile="docs/context.md"
      onSelect={() => {}}
    />,
  )

  expect(markup).toContain('data-node-kind="folder"')
  expect(markup).toContain('aria-expanded="true"')
})
```

- [ ] **Step 6: Run the component tests to verify they fail**

Run: `pnpm exec vitest run packages/web/src/components/context-file-list.test.tsx packages/web/src/components/task-detail-panels.test.tsx`

Expected: FAIL because the current list still renders text buttons and folders without toggle state.

- [ ] **Step 7: Implement icon-only collapse and per-folder toggle state**

```tsx
const [expandedFolders, setExpandedFolders] = useState<ReadonlySet<string>>(() =>
  createInitialExpandedFolders(folderPaths, selectedFile),
)

function toggleFolder(folderPath: string) {
  setExpandedFolders(current => {
    const next = new Set(current)
    if (next.has(folderPath)) next.delete(folderPath)
    else next.add(folderPath)
    return next
  })
}

<button
  type="button"
  className="context-file-list-icon-toggle"
  aria-label={collapsed ? 'Expand file list' : 'Collapse file list'}
  onClick={onToggleCollapse}
>
  <span aria-hidden="true">{collapsed ? '⟫' : '⟪'}</span>
</button>

<button
  type="button"
  className="context-file-tree-row"
  data-node-kind="folder"
  aria-expanded={isExpanded}
  onClick={() => toggleFolder(node.path)}
>
  <span className="context-file-tree-icon">📁</span>
  <span className="truncate">{node.name}</span>
</button>
```

- [ ] **Step 8: Update split-pane and tree CSS for collapsed folders**

```css
.context-file-list-icon-toggle {
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: 999px;
}

.context-file-tree-row[data-node-kind='folder'] {
  background: rgba(255, 250, 242, 0.72);
}

.context-file-tree-row[data-node-kind='file'] {
  background: rgba(255, 255, 255, 0.66);
}
```

- [ ] **Step 9: Run the Context Vault tree tests to verify they pass**

Run: `pnpm exec vitest run packages/web/src/lib/context-vault/tree-state.test.ts packages/web/src/components/context-file-list.test.tsx packages/web/src/components/task-detail-panels.test.tsx`

Expected: PASS.

- [ ] **Step 10: Commit the tree UX slice**

```bash
git add packages/web/src/lib/context-vault/tree-state.ts \
  packages/web/src/lib/context-vault/tree-state.test.ts \
  packages/web/src/components/context-file-list.tsx \
  packages/web/src/components/context-file-list.test.tsx \
  packages/web/src/components/task-detail-panels.tsx \
  packages/web/src/components/task-detail-panels.test.tsx \
  packages/web/src/app/globals.css
git commit -m "Refine context vault tree interactions"
```

## Task 2: Restore Markdown List Semantics And Viewer Polish

**Files:**
- Modify: `packages/web/src/components/context-file-preview.tsx`
- Test: `packages/web/src/components/context-file-preview.test.tsx`
- Modify: `packages/web/src/app/globals.css`

- [ ] **Step 1: Write the failing markdown list preview test**

```ts
it('renders unordered and ordered list markers in markdown preview', () => {
  const file: PersistedContextVaultFile = {
    relativePath: 'docs/lists.md',
    absolutePath: '/tmp/docs/lists.md',
    content: '- alpha\n- beta\n  - nested\n\n1. one\n2. two',
    category: 'markdown',
    mediaType: 'text/markdown',
  }

  const markup = renderToStaticMarkup(<ContextFilePreview file={file} />)

  expect(markup).toContain('<ul>')
  expect(markup).toContain('<ol>')
  expect(markup).toContain('<li>alpha</li>')
  expect(markup).toContain('<li>nested</li>')
})
```

- [ ] **Step 2: Run the markdown preview test to verify it fails for the intended reason**

Run: `pnpm exec vitest run packages/web/src/components/context-file-preview.test.tsx`

Expected: FAIL once assertions are extended to include nested list semantics or CSS class expectations not yet present.

- [ ] **Step 3: Add explicit list renderers only if needed, otherwise keep renderer minimal and fix CSS**

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    ul: ({ children }) => <ul className="context-preview-list context-preview-list--unordered">{children}</ul>,
    ol: ({ children }) => <ol className="context-preview-list context-preview-list--ordered">{children}</ol>,
    li: ({ children }) => <li className="context-preview-list-item">{children}</li>,
  }}
>
  {content}
</ReactMarkdown>
```

- [ ] **Step 4: Add markdown list CSS that preserves markers and nested indentation**

```css
.context-preview-list--unordered {
  list-style: disc;
  padding-left: 1.4rem;
}

.context-preview-list--ordered {
  list-style: decimal;
  padding-left: 1.5rem;
}

.context-preview-list .context-preview-list {
  margin-top: 0.45rem;
}

.context-preview-list-item::marker {
  color: var(--text-primary);
}
```

- [ ] **Step 5: Re-run markdown preview tests**

Run: `pnpm exec vitest run packages/web/src/components/context-file-preview.test.tsx`

Expected: PASS, including existing mermaid coverage.

- [ ] **Step 6: Commit the markdown viewer slice**

```bash
git add packages/web/src/components/context-file-preview.tsx \
  packages/web/src/components/context-file-preview.test.tsx \
  packages/web/src/app/globals.css
git commit -m "Fix markdown list rendering in context preview"
```

## Task 3: Add Base-Branch Controls To Workspace UI

**Files:**
- Modify: `packages/web/src/components/workspace-panel.tsx`
- Test: `packages/web/src/components/workspace-panel.test.tsx`

- [ ] **Step 1: Write the failing workspace panel tests**

```ts
it('renders base branch controls and auto-pull toggle', async () => {
  const { WorkspacePanelView } = await import('./workspace-panel')
  const markup = renderToStaticMarkup(
    <WorkspacePanelView
      task={makeTask()}
      loading={false}
      settingsLoading={false}
      error={null}
      workspaceName="alpha-ui"
      workspaceBranch="feature/alpha-ui"
      baseBranch="main"
      autoPullBaseBranch
      availableBaseBranches={['main', 'develop']}
      subrepoBranches={{}}
      detectedSubrepos={['packages/ui']}
      availableExistingWorktrees={[]}
      selectedExistingWorktreePath=""
      recoverableBaseBranchError={null}
      onWorkspaceNameChange={() => {}}
      onWorkspaceBranchChange={() => {}}
      onBaseBranchChange={() => {}}
      onAutoPullBaseBranchChange={() => {}}
      onSubrepoBranchChange={() => {}}
      onSelectedExistingWorktreeChange={() => {}}
      onRetryWithForceRefresh={() => {}}
      onSave={() => {}}
      onInitOrAttach={() => {}}
      onCleanup={() => {}}
    />,
  )

  expect(markup).toContain('Base Branch')
  expect(markup).toContain('Auto-pull latest from base branch')
})
```

- [ ] **Step 2: Run the workspace panel tests to verify they fail**

Run: `pnpm exec vitest run packages/web/src/components/workspace-panel.test.tsx`

Expected: FAIL because the current props and UI do not include base-branch controls.

- [ ] **Step 3: Extend the panel state and view props with base-branch controls**

```tsx
const [baseBranch, setBaseBranch] = useState('')
const [availableBaseBranches, setAvailableBaseBranches] = useState<readonly string[]>([])
const [autoPullBaseBranch, setAutoPullBaseBranch] = useState(true)
const [recoverableBaseBranchError, setRecoverableBaseBranchError] = useState<string | null>(null)

<GlassSelect
  label="Base Branch"
  value={baseBranch}
  onChange={event => onBaseBranchChange(event.target.value)}
  options={availableBaseBranches.map(branch => ({ value: branch, label: branch }))}
/>

<label className="workspace-toggle-row">
  <input
    type="checkbox"
    checked={autoPullBaseBranch}
    onChange={event => onAutoPullBaseBranchChange(event.target.checked)}
  />
  <span>Auto-pull latest from base branch</span>
</label>
```

- [ ] **Step 4: Add retry UI for recoverable base-branch failures**

```tsx
{recoverableBaseBranchError ? (
  <div className="utility-panel-error">
    <p>{recoverableBaseBranchError}</p>
    <GlassButton variant="secondary" onClick={onRetryWithForceRefresh}>
      Force Refresh Base Branch
    </GlassButton>
  </div>
) : null}
```

- [ ] **Step 5: Re-run the workspace panel tests**

Run: `pnpm exec vitest run packages/web/src/components/workspace-panel.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the workspace panel slice**

```bash
git add packages/web/src/components/workspace-panel.tsx \
  packages/web/src/components/workspace-panel.test.tsx
git commit -m "Add base branch controls to workspace panel"
```

## Task 4: Implement Base-Branch Preparation And Recoverable Init Errors

**Files:**
- Create: `packages/web/src/lib/workspace/base-branch.ts`
- Test: `packages/web/src/lib/workspace/base-branch.test.ts`
- Modify: `packages/web/src/lib/workspace/git-branch.ts`
- Modify: `packages/web/src/app/api/tasks/[taskId]/workspace/route.ts`
- Test: `packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts`
- Modify: `packages/core/src/workspace/branch.ts`
- Test: `packages/core/tests/workspace/branch.test.ts`

- [ ] **Step 1: Write the failing base-branch helper tests**

```ts
it('creates a missing branch from an explicit base branch', () => {
  prepareRootBranch({
    repoRoot: tmpDir,
    targetBranch: 'feature/new-ui',
    baseBranch: defaultBranch,
    autoPull: false,
    forceRefresh: false,
  })

  expect(branchExists(tmpDir, 'feature/new-ui')).toBe(true)
})

it('returns a recoverable error when auto-pull fails', () => {
  expect(() =>
    prepareRootBranch({
      repoRoot: tmpDir,
      targetBranch: 'feature/new-ui',
      baseBranch: 'missing-remote',
      autoPull: true,
      forceRefresh: false,
    }),
  ).toThrow(/recoverable/i)
})
```

- [ ] **Step 2: Run the helper and route tests to verify they fail**

Run: `pnpm exec vitest run packages/web/src/lib/workspace/base-branch.test.ts packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts packages/core/tests/workspace/branch.test.ts`

Expected: FAIL because the helper file and recoverable route behavior do not exist yet.

- [ ] **Step 3: Implement low-level branch helpers needed by the web route**

```ts
export function listBranches(repoRoot: string): readonly string[] {
  const output = execSync('git for-each-ref --format="%(refname:short)" refs/heads refs/remotes', {
    cwd: repoRoot,
    stdio: 'pipe',
  }).toString()

  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export function currentBranch(repoRoot: string): string {
  return execSync('git branch --show-current', { cwd: repoRoot, stdio: 'pipe' })
    .toString()
    .trim()
}
```

- [ ] **Step 4: Implement base-branch preparation with structured recoverable errors**

```ts
export class RecoverableBaseBranchError extends Error {
  readonly code = 'BASE_BRANCH_PULL_FAILED'
  readonly canForceRefresh = true
}

export function prepareRootBranch(config: PrepareRootBranchConfig): void {
  if (branchExists(config.repoRoot, config.targetBranch)) {
    return
  }

  checkoutBranch(config.repoRoot, config.baseBranch)

  if (config.forceRefresh) {
    execSync(`git fetch origin "${config.baseBranch}"`, { cwd: config.repoRoot, stdio: 'pipe' })
    execSync(`git reset --hard "origin/${config.baseBranch}"`, { cwd: config.repoRoot, stdio: 'pipe' })
  } else if (config.autoPull) {
    try {
      execSync(`git pull --ff-only origin "${config.baseBranch}"`, { cwd: config.repoRoot, stdio: 'pipe' })
    } catch (error) {
      throw new RecoverableBaseBranchError(
        `Failed to pull base branch "${config.baseBranch}" before creating "${config.targetBranch}".`,
      )
    }
  }

  createBranch(config.repoRoot, config.targetBranch, config.baseBranch)
}
```

- [ ] **Step 5: Update the workspace route to surface `baseBranch`, `autoPullBaseBranch`, and `forceRefreshBaseBranch`**

```ts
if (!branchExists(repoRoot, branchName)) {
  prepareRootBranch({
    repoRoot,
    targetBranch: branchName,
    baseBranch,
    autoPull: autoPullBaseBranch,
    forceRefresh: forceRefreshBaseBranch,
  })
}

return NextResponse.json({
  error: error.message,
  code: error.code,
  recoverable: error instanceof RecoverableBaseBranchError,
  canForceRefresh: error instanceof RecoverableBaseBranchError,
}, { status: 400 })
```

- [ ] **Step 6: Re-run branch and workspace route tests**

Run: `pnpm exec vitest run packages/web/src/lib/workspace/base-branch.test.ts packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts packages/core/tests/workspace/branch.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the base-branch slice**

```bash
git add packages/web/src/lib/workspace/base-branch.ts \
  packages/web/src/lib/workspace/base-branch.test.ts \
  packages/web/src/lib/workspace/git-branch.ts \
  packages/web/src/app/api/tasks/[taskId]/workspace/route.ts \
  packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts \
  packages/core/src/workspace/branch.ts \
  packages/core/tests/workspace/branch.test.ts
git commit -m "Add explicit base branch preparation for workspaces"
```

## Task 5: Materialize Nested Repos Inside Worktrees

**Files:**
- Create: `packages/web/src/lib/workspace/nested-worktree.ts`
- Test: `packages/web/src/lib/workspace/nested-worktree.test.ts`
- Modify: `packages/web/src/app/api/tasks/[taskId]/workspace/route.ts`
- Test: `packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts`
- Modify: `packages/core/src/workspace/worktree.ts`
- Test: `packages/core/tests/workspace/worktree.test.ts`

- [ ] **Step 1: Write the failing nested worktree tests**

```ts
it('copies a configured nested repo into the worktree and checks out the requested branch there', () => {
  materializeNestedRepoWorktrees({
    repoRoot,
    worktreePath,
    nestedRepos: [{ repoPath: 'packages/ui', branch: 'feature/ui-worktree' }],
  })

  expect(fs.existsSync(path.join(worktreePath, 'packages/ui/.git'))).toBe(true)
  expect(currentBranch(path.join(worktreePath, 'packages/ui'))).toBe('feature/ui-worktree')
})
```

- [ ] **Step 2: Run the nested worktree tests to verify they fail**

Run: `pnpm exec vitest run packages/web/src/lib/workspace/nested-worktree.test.ts packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts packages/core/tests/workspace/worktree.test.ts`

Expected: FAIL because nested repos are not currently materialized under the worktree.

- [ ] **Step 3: Implement nested repo materialization in a focused helper**

```ts
export function materializeNestedRepoWorktrees(config: NestedWorktreeConfig): void {
  for (const nestedRepo of config.nestedRepos) {
    const sourceRepoPath = path.join(config.repoRoot, nestedRepo.repoPath)
    const targetRepoPath = path.join(config.worktreePath, nestedRepo.repoPath)

    fs.mkdirSync(path.dirname(targetRepoPath), { recursive: true })
    execSync(`git clone "${sourceRepoPath}" "${targetRepoPath}"`, { stdio: 'pipe' })

    const baseBranch = currentBranch(sourceRepoPath)
    prepareNestedBranch({
      repoRoot: targetRepoPath,
      targetBranch: nestedRepo.branch,
      baseBranch,
    })
  }
}
```

- [ ] **Step 4: Call the nested repo helper only when overrides are configured**

```ts
if (!selectedExistingWorktree && subrepoBranches.length > 0) {
  materializeNestedRepoWorktrees({
    repoRoot,
    worktreePath,
    nestedRepos: subrepoBranches,
  })
}
```

- [ ] **Step 5: Re-run nested repo tests**

Run: `pnpm exec vitest run packages/web/src/lib/workspace/nested-worktree.test.ts packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts packages/core/tests/workspace/worktree.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the nested repo slice**

```bash
git add packages/web/src/lib/workspace/nested-worktree.ts \
  packages/web/src/lib/workspace/nested-worktree.test.ts \
  packages/web/src/app/api/tasks/[taskId]/workspace/route.ts \
  packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts \
  packages/core/src/workspace/worktree.ts \
  packages/core/tests/workspace/worktree.test.ts
git commit -m "Materialize nested repos inside task worktrees"
```

## Task 6: Final Integration Verification

**Files:**
- Modify as needed from previous tasks only
- Test:
  - `packages/web/src/components/context-file-list.test.tsx`
  - `packages/web/src/components/context-file-preview.test.tsx`
  - `packages/web/src/components/task-detail-panels.test.tsx`
  - `packages/web/src/components/workspace-panel.test.tsx`
  - `packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts`
  - `packages/web/src/lib/context-vault/tree-state.test.ts`
  - `packages/web/src/lib/workspace/base-branch.test.ts`
  - `packages/web/src/lib/workspace/nested-worktree.test.ts`
  - `packages/core/tests/workspace/branch.test.ts`
  - `packages/core/tests/workspace/worktree.test.ts`

- [ ] **Step 1: Run the focused integration suite**

Run:

```bash
pnpm exec vitest run \
  packages/web/src/components/context-file-list.test.tsx \
  packages/web/src/components/context-file-preview.test.tsx \
  packages/web/src/components/task-detail-panels.test.tsx \
  packages/web/src/components/workspace-panel.test.tsx \
  packages/web/src/app/api/tasks/[taskId]/workspace/route.test.ts \
  packages/web/src/lib/context-vault/tree-state.test.ts \
  packages/web/src/lib/workspace/base-branch.test.ts \
  packages/web/src/lib/workspace/nested-worktree.test.ts \
  packages/core/tests/workspace/branch.test.ts \
  packages/core/tests/workspace/worktree.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `pnpm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run the app build**

Run: `pnpm run build`

Expected: PASS.

- [ ] **Step 4: Review changed files for immutability, type safety, error handling, and security**

Check:

```text
- No route mutates request-derived objects in place.
- No branch/worktree command interpolates unchecked user input without quoting.
- Recoverable error payloads stay structured and do not leak unnecessary command output.
- Folder toggle state survives polling refresh without resetting the selected file.
```

- [ ] **Step 5: Commit the final integration pass**

```bash
git add packages/web/src/components/context-file-list.tsx \
  packages/web/src/components/context-file-preview.tsx \
  packages/web/src/components/task-detail-panels.tsx \
  packages/web/src/components/workspace-panel.tsx \
  packages/web/src/app/api/tasks/[taskId]/workspace/route.ts \
  packages/web/src/app/globals.css \
  packages/web/src/lib/context-vault/tree-state.ts \
  packages/web/src/lib/workspace/base-branch.ts \
  packages/web/src/lib/workspace/nested-worktree.ts \
  packages/core/src/workspace/branch.ts \
  packages/core/src/workspace/worktree.ts
git commit -m "Polish context vault tree and workspace init flow"
```
