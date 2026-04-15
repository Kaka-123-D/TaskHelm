# Context Vault Tree And Workspace Init Design

Date: 2026-04-15

## Goal

Refine the task detail workbench in two places:

1. Make the local `Context Vault` easier to browse and read by tightening the file tree UI and improving markdown preview quality.
2. Make workspace initialization explicit and safe for branch creation, nested repo handling, and recovery when the requested branch does not already exist.

This spec only covers the new behavior above. It builds on the current local-first `TaskHelm` state captured in commit `700c591`.

## Scope

### In Scope

- Replace the text `Collapse list` / `Expand list` control with compact icon buttons.
- Make folder nodes in the `Context Vault` tree collapsible and expandable.
- Render collapsed folders as first-class tree items, visually distinct from files but aligned to the same rhythm.
- Fix markdown preview so unordered and ordered lists render with visible markers and correct nesting.
- Keep `react-markdown + remark-gfm + mermaid`; improve presentation through structure and CSS, not by adopting a separate markdown editor framework.
- Expand workspace init settings so branch creation from a base branch is explicit.
- Support nested git repos inside the created worktree when an override branch is configured for that nested repo.
- Add branch creation recovery controls for auto-pull and forced refresh of the chosen base branch.

### Out of Scope

- Replacing the markdown preview stack with a full editor or WYSIWYG.
- Auto-materializing every nested repo into the worktree by default.
- Changing the task list runtime card layout beyond data already shown there.
- Changing CLI UX unless a shared helper change requires compatible CLI behavior and test updates.

## Current Problems

### Context Vault

- The sidebar-wide collapse control is text-heavy and visually noisy.
- Folder rows are always expanded, so deep trees stay busy and consume width.
- Collapsed folders do not behave like normal tree items, which makes scanning inconsistent.
- Markdown preview loses bullet and ordered list markers because the preview CSS suppresses or fails to restyle list semantics correctly.

### Workspace Init

- Nested repo branch overrides currently run against the nested repo under the root checkout, not inside the created worktree.
- If a target branch does not exist, the system creates it implicitly without showing which base branch it comes from.
- There is no explicit path for updating the chosen base branch before creating a new branch.
- There is no structured recovery when pulling the base branch fails or when the local base branch diverges.

## Design

## 1. Context Vault Tree

### 1.1 Sidebar Collapse Control

- Replace the text control with an icon-only button in the file list header.
- Use a compact chevron or panel-collapse style icon.
- Preserve the existing sidebar-wide collapsed state in session state.
- Keep the current split-pane width animation; only the control affordance changes.

### 1.2 Folder Node Behavior

- Each folder node gets its own open/closed state.
- Default state:
  - root-level folders start expanded
  - nested folders start expanded when they contain the selected file
  - otherwise nested folders start collapsed
- Clicking a folder row toggles that folder only.
- Collapsed folder rows render like list items with:
  - folder icon
  - folder name
  - subtle count or affordance style optional, only if it fits cleanly
  - different badge or fill treatment from files so users can distinguish folder rows immediately
- Expanded folder rows show their children indented underneath.

### 1.3 Selection Rules

- Clicking a file selects it for preview.
- Clicking a folder never changes the previewed file; it only toggles expansion.
- If the currently selected file lives in a collapsed folder, that folder auto-expands on initial render and after polling refresh.

## 2. Markdown Preview

### 2.1 Rendering Stack

- Keep the current preview stack:
  - `react-markdown`
  - `remark-gfm`
  - custom `mermaid` block renderer
- Do not introduce a separate markdown viewer dependency in this phase.

### 2.2 Presentation

- Fix CSS so `ul`, `ol`, and `li` render proper markers.
- Support nested list indentation and spacing.
- Preserve existing support for:
  - tables
  - blockquotes
  - code blocks
  - inline code
  - images
  - mermaid diagrams
- Improve the document-viewer feel using CSS only:
  - better vertical rhythm
  - clearer heading spacing
  - visible list markers
  - stable preview viewport height with internal scrolling

## 3. Workspace Initialization Flow

## 3.1 Saved Settings

The task keeps its saved runtime preferences:

- `workspace_name`
- `workspace_branch`
- `workspace_subrepo_branches_json`
- `preferred_port`

This spec extends the workspace init payload with:

- `baseBranch`
- `autoPullBaseBranch`
- `forceRefreshBaseBranch`

These values are init-time controls, not long-term task fields unless later explicitly promoted.

## 3.2 Main Repo Branch Creation

When the user clicks `Init Workspace`:

- If `workspaceBranch` already exists in the root repo:
  - create the worktree from that branch as usual.
- If `workspaceBranch` does not exist:
  - do not silently create it from HEAD.
  - treat the selected `baseBranch` as the source branch.
  - default `baseBranch` to the current branch of the root repo.
  - expose that default in the UI before submission.

### Base Branch Options

- The UI shows a dropdown/select of detected local and remote branch names, with search when the list is long.
- The default selected branch is the current branch at the root repo.

### Auto-Pull

- If `autoPullBaseBranch` is enabled:
  - checkout the chosen base branch in the root repo
  - pull latest changes for that base branch
  - then create the new branch from the updated base branch
- If `autoPullBaseBranch` is disabled:
  - branch creation happens from the local state of the selected base branch

### Pull Failure Recovery

- If pull fails, the API returns a structured error payload indicating:
  - the selected base branch
  - that pull failed
  - whether forced refresh is available
- The UI then offers a retry path that sets `forceRefreshBaseBranch = true`.

### Forced Refresh Behavior

If `forceRefreshBaseBranch` is enabled:

- fetch from origin
- reset the local base branch to `origin/<baseBranch>`
- then create the target branch from that refreshed base branch

This force-refresh path is only allowed for the selected base branch in the root repo, not for arbitrary refs.

## 3.3 Nested Repo Materialization Inside Worktree

When a nested repo override is configured:

- after the root worktree is created, `TaskHelm` materializes that nested repo under the same relative path inside the worktree
- the nested repo inside the worktree becomes the checkout target for its configured branch

Behavior per nested repo:

- If no override branch is configured:
  - do not materialize that nested repo into the worktree during this flow
- If an override branch is configured:
  - ensure the nested repo exists inside the worktree at the same relative path
  - detect the nested repo current branch from the source nested repo and use it as the default nested base branch
  - if the requested nested branch exists, checkout it inside the nested repo in the worktree
  - if the requested nested branch does not exist, create it from the nested repo base branch inside the worktree

The root repo and each nested repo are treated independently for branch operations.

## 4. Error Handling

### Context Vault

- Tree state failure must not blank the preview.
- If tree state becomes invalid after polling, preserve the selected file when it still exists.
- If the selected file disappears, choose the nearest surviving file in the same folder subtree; otherwise fall back to the first available file.

### Workspace Init

Return explicit errors for:

- duplicate workspace name inside the same project
- selected branch missing when no base branch is provided
- base branch missing
- base branch pull failure
- forced refresh failure
- nested repo materialization failure
- nested repo branch checkout or creation failure

Error payloads for branch creation must include machine-readable hints so the UI can decide whether to show a retry-with-force-refresh action.

## 5. Testing

### Context Vault

- tree builder tests for folder/file hierarchy
- component tests for:
  - icon-only collapse button
  - per-folder toggle behavior
  - selected file remains visible when ancestors expand
- markdown preview tests for:
  - unordered lists
  - ordered lists
  - nested lists
  - mermaid still rendering through the custom block path

### Workspace

- route tests for:
  - branch exists path
  - branch missing path with explicit base branch
  - auto-pull success
  - auto-pull failure returning recoverable error
  - force refresh path
  - nested repo materialized into worktree and checked out to requested branch
- panel tests for:
  - base branch selector visibility
  - auto-pull toggle
  - recoverable error UI

## 6. Rollout Notes

- This spec intentionally keeps the existing task detail structure and only refines the `Context Vault` and `Workspace` interaction surfaces.
- Helper changes in shared workspace branch/worktree code have `HIGH` upstream impact because they also affect CLI workspace flows. Keep shared helper edits minimal and update direct dependents and tests together.
