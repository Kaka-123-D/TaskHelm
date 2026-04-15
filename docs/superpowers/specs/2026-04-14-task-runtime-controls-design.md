# Task Runtime Controls Design

## Goal

Make task runtime setup explicit and persistent. Task detail should show human-readable priority labels, let users configure workspace and dev-server preferences before running commands, preserve local context folder hierarchy in the vault list, and expose the same runtime metadata and controls from the task list.

## Scope

This phase covers:

- Task detail priority label rendering
- Persisted task-level workspace settings
- Persisted task-level preferred dev port
- Workspace initialization UI and API updates
- Dev start/stop UI and API updates
- Context vault tree rendering that preserves local folder hierarchy
- Task list runtime metadata and controls

This phase does not cover:

- Multi-user conflict resolution for workspace names
- Background syncing of git branch lists
- Arbitrary manual sub-repo override rows
- Auto-fallback to a different port when the preferred one is occupied

## Existing Behavior

- Task detail shows `priority` as a raw numeric value.
- `Init Workspace` immediately creates a branch/worktree from project defaults with no user input.
- `Start` immediately allocates a port with no user-selected preference.
- Task runtime choices are not persisted as preferences separate from runtime state.
- Context vault files are rendered as a flat list by `relativePath`.
- Task list rows only show status and active port badge.

## Desired Behavior

### Priority Label

Task detail should render the same labels used by task forms:

- `1` → `Critical`
- `2` → `High`
- `3` → `Normal`
- `4` → `Low`
- `5` → `Backlog`

If an unexpected value is encountered, render the numeric value as a fallback.

### Persisted Task Runtime Settings

Each task should persist these preferences:

- `workspace_name`
- `workspace_branch`
- `workspace_subrepo_branches_json`
- `preferred_port`

These are saved preferences, not just one-shot modal inputs.

Existing runtime fields remain:

- `branch_name`
- `worktree_path`
- `port`
- `dev_server_state`

The saved preferences and runtime state can differ temporarily. Example: a preferred port can be saved even when the dev server is stopped.

### Workspace Configuration

Task detail `Workspace` panel should allow editing saved workspace settings before initialization:

- `Workspace name`
- `Main repo branch`
- one branch input per detected sub-repo with its own `.git`

Sub-repo rows should be detected automatically from the project repo root. Only detected sub-repos should be shown.

Workspace name rules:

- required for initialization
- unique within the same project
- validated server-side

Branch rules:

- if branch exists in a repo, checkout that branch
- if branch does not exist in a repo, create it and checkout it

Initialization should use saved preferences. The task should keep those values for later editing and reuse.

Cleanup should remove runtime state (`branch_name`, `worktree_path`, `port`, `dev_server_state`) but keep saved preferences so the user does not need to re-enter them later.

### Sub-repo Detection

When loading the workspace configuration UI, TaskHelm should scan the project repo root recursively for nested directories containing `.git`.

Rules:

- exclude the project root repo itself from the sub-repo list
- include only real nested repo folders
- sort by relative path for stable rendering

Each detected sub-repo is configured by relative path plus branch name.

### Dev Server Configuration

Task detail `Dev Server` panel should allow editing a saved `Preferred port`.

Start behavior:

- requires an initialized workspace
- uses the saved preferred port when present
- if the preferred port is occupied or already reserved, return a clear error
- if no preferred port is set, fall back to existing allocation behavior

Stop behavior:

- stops the running dev server
- releases the active runtime port
- keeps `preferred_port` unchanged

### Context Vault Tree

The context vault file list should preserve local folder hierarchy instead of flattening everything.

Behavior:

- derive a tree from `relativePath`
- render folders and files in hierarchy order
- folders can collapse/expand
- files remain selectable preview targets
- selected file highlighting still works

If there are no nested folders, the list should still render naturally.

### Task List

Each task row should expose runtime metadata and controls directly in the list:

- workspace name
- branch name
- active port
- `Start` button when dev server is not running
- `Stop` button when dev server is running
- `Delete` button

Interaction rules:

- clicking the row body still opens task detail
- clicking `Start`, `Stop`, or `Delete` must not navigate
- `Start` uses the saved `preferred_port`
- `Delete` uses the existing confirm flow

If there is no workspace initialized yet:

- show saved workspace name when available
- show branch/runtime fields with empty or fallback text
- `Start` remains disabled until a worktree exists

## Data Model Changes

Add task columns:

- `workspace_name TEXT`
- `workspace_branch TEXT`
- `workspace_subrepo_branches_json TEXT`
- `preferred_port INTEGER`

Update:

- core `Task` type
- `TaskRepository` create/update/row mapping
- migrations and tests

## API Changes

### Workspace Route

`POST /api/tasks/[taskId]/workspace`

Accept body:

- `workspaceName`
- `workspaceBranch`
- `subrepoBranches`

Behavior:

- validate task + project
- validate unique workspace name within project
- discover sub-repos from project root
- validate/normalize overrides against detected sub-repos
- create/check out branches for main repo and sub-repos
- create worktree at a path derived from saved workspace name
- persist both saved preferences and applied runtime state

`DELETE /api/tasks/[taskId]/workspace`

Behavior:

- remove worktree
- clear applied runtime state
- preserve saved preferences

### Dev Route

`POST /api/tasks/[taskId]/dev`

Accept optional body:

- `preferredPort`

Behavior:

- persist preferred port when provided
- use preferred port if present
- fail clearly if the preferred port cannot be used
- otherwise allocate dynamically as today

`DELETE /api/tasks/[taskId]/dev`

Behavior:

- stop running process
- release active port
- keep `preferred_port`

### Workspace Config Discovery

Add a task-focused configuration route or extend existing task page data loading to provide:

- saved workspace settings
- detected sub-repos for the project

This data should be available without initializing the workspace.

## UI Structure

### Task Detail

Task hero:

- replace numeric priority with label

Workspace panel:

- metadata summary at top
- editable fields for saved settings
- validation/error area
- `Save Settings` and `Init Workspace` actions when no worktree exists
- `Save Settings` and `Cleanup` when worktree exists

Dev panel:

- editable preferred port field
- saved value shown even when server is stopped
- `Start` / `Stop` action

Context vault:

- left pane becomes tree list
- right pane stays preview

### Task List

Task rows become richer action rows:

- left: title and goal
- center/right metadata chips for workspace name, branch, port
- action cluster with `Start/Stop` and `Delete`

## Validation And Errors

- duplicate workspace name in project → show explicit validation error
- invalid branch name input → reject before git mutation when feasible
- preferred port not available → show explicit error, do not silently allocate another one
- sub-repo override referencing a repo no longer detected → ignore stale saved override in UI, and drop it on next save

## Testing

Add or update tests for:

- priority label mapping
- task repository persistence for new fields
- workspace route validation and persistence
- dev route preferred-port behavior
- context tree derivation
- task detail UI rendering for saved settings
- task list actions rendering without navigation regression

