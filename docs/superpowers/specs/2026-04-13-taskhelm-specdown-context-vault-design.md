# TaskHelm SpecDown Context Vault Design

Date: 2026-04-13
Status: Proposed
Scope: TaskHelm-first phase only

## Goal

Replace the current hardcoded task context file panel with a state-driven `Context Vault` workflow in `TaskHelm`, while preparing a deep integration path to `SpecDown`.

This phase only implements `TaskHelm` changes. Real network integration and server-side support in `SpecDown` are intentionally deferred.

## Background

Current behavior is incomplete:

- `TaskHelm` only reads four fixed files from the task capsule: `context.md`, `plan.md`, `handoff.md`, `review.md`
- the task detail screen renders a placeholder `Open SpecDown` link based only on `project.specdown_project_ref`
- there is no account connect flow, no project binding flow, no task-to-folder mapping, no vault explorer, and no push/pull semantics

`SpecDown` already has useful primitives:

- project URLs in the form `/{username}/{projectSlug}`
- a project document tree with folders
- import logic that accepts markdown files by relative path

But `SpecDown` does not yet expose a dedicated external integration contract for `TaskHelm`.

## Phase Boundary

### Included in this phase

- new `TaskHelm` data model for SpecDown connection and mapping state
- task detail UI state machine for connect, bind, and vault exploration
- local markdown vault exploration for files and folders
- recursive markdown discovery for selected folders
- local preview and selection model for markdown files
- action bar for `Push to SpecDown`, `Pull from SpecDown`, and `Edit in SpecDown`
- a TaskHelm-side integration adapter boundary with stub/mock implementations

### Explicitly excluded from this phase

- real OAuth/account connect with `SpecDown`
- real project list fetch from `SpecDown`
- real push or pull over network
- real online edit deep linking to specific SpecDown documents
- any code changes inside the `SpecDown` repository

## Task Detail State Machine

The `Execution Surface` panel will no longer assume local context files exist by default.

It will render one of the following states:

### 1. SpecDown disconnected

Show:

- short explanation that SpecDown is not connected yet
- primary button `Connect SpecDown`

Behavior:

- click opens a TaskHelm-managed connect modal
- in this phase the modal is stubbed and clearly marked as pending real SpecDown integration
- no hidden fake success path

### 2. SpecDown connected but project not bound

Show:

- explanation that the TaskHelm project is not linked to a SpecDown project
- primary button `Setup Project SpecDown`

Behavior:

- click opens a modal that lists SpecDown projects from a stub adapter
- selection persists the chosen project binding into TaskHelm state

### 3. Project bound

Show:

- editable `Task folder name`
- computed task folder path preview under `/tasks/{folderName}`
- primary button `Explore Context Vault`
- action bar for sync/edit actions

The default task folder convention is:

- root container: `/tasks`
- task folder path: `/tasks/{custom-folder-name}`

This convention is fixed for phase 1 so push/pull scope remains predictable and safe.

## Context Vault Explorer

The panel starts empty until the user explicitly explores or selects content.

Default empty state copy:

- no selected markdown context yet
- click `Explore Context Vault` to choose `.md` files or a folder that contains markdown files

### Selection behavior

The explorer must support:

- selecting individual `.md` files
- selecting a folder

When a folder is selected:

- recursively scan descendants
- include only `.md` files
- flatten the result into a file list with relative paths

The resulting file list becomes the task's current local vault selection.

### Preview behavior

Once files are selected:

- render a list of markdown files using relative paths instead of the old fixed names
- selecting an item shows preview content in the right-hand preview panel
- if no file is selected yet, auto-select the first file

## Sync Actions

The action bar becomes visible after the project is bound.

Actions:

- `Push to SpecDown`
- `Pull from SpecDown`
- `Edit in SpecDown`

### Phase 1 behavior

These actions exist now but are adapter-driven.

- `Push to SpecDown` uses a stub implementation and shows the exact payload that would be sent later
- `Pull from SpecDown` uses a stub implementation and shows the exact result shape expected later
- `Edit in SpecDown` uses a project-level online URL when available from local binding state, otherwise disabled

This keeps the UI and state transitions real, while deferring network integration cleanly.

## Project-level state

Add TaskHelm project fields for future-friendly SpecDown binding:

- `specdown_mode`
- `specdown_project_ref`
- `specdown_project_id`
- `specdown_owner_username`
- `specdown_project_slug`

`specdown_project_ref` remains the canonical human-readable composite value, but phase 1 should stop assuming it is the only usable field.

## Task-level state

Add TaskHelm task fields:

- `specdown_folder_name`
- `specdown_folder_path`
- `specdown_last_pushed_at`
- `specdown_last_pulled_at`

Add local selection persistence for the task:

- selected vault root path or source path list
- discovered markdown files with relative paths
- current selected preview file

The persisted shape must be explicit enough that a later real integration can reuse it without redesigning the UI model.

## Push

Scope is limited to the task folder subtree only.

For example:

- task folder path `/tasks/fix-auth-refresh`

Push uses mirror semantics:

- local selected markdown files are upserted into the task folder subtree
- files that exist in the task folder subtree on SpecDown but are no longer present in the local selected set are deleted
- nothing outside that subtree may be modified

This delete permission is intentional and approved, but only inside the task folder subtree.

## Pull

Scope is also limited to the task folder subtree only.

Pull uses SpecDown-priority semantics:

- the SpecDown subtree becomes the source of truth
- local TaskHelm selection for that task is replaced by the pulled result
- files that were previously tracked locally for this task but no longer exist in the SpecDown subtree are removed from the local task selection

## Adapter Boundary

TaskHelm must introduce a dedicated SpecDown integration adapter instead of scattering placeholder logic through UI components.

Minimum adapter responsibilities:

- get account connection state
- start connect flow
- list available SpecDown projects
- bind a TaskHelm project to a SpecDown project
- build project edit URL
- push task subtree payload
- pull task subtree payload

For phase 1, the adapter implementation is local and stubbed, but the interface should match the later real contract as closely as possible.

## UI Copy And Safety

- do not claim that real SpecDown sync is active when it is not
- phase 1 placeholders must explicitly say integration is not yet live
- destructive wording for push mirror behavior must say it may delete files inside the current task folder subtree only
- task folder path preview should always be visible before push/pull

## Migration Strategy

Existing projects with no SpecDown data remain valid:

- they start in `disconnected` or `unbound` state depending on available local data
- old fixed context file display is replaced by the new empty-state vault explorer

Backward compatibility:

- if legacy fixed capsule files exist, they can be surfaced as one possible local vault source in the explorer flow
- but the UI should no longer hardcode those four files as the default model

## Implementation Notes

- keep all real SpecDown calls behind an adapter or route boundary
- avoid importing from the `SpecDown` repository directly
- make the UI usable and testable with stub data
- write tests for each visible state and for folder markdown discovery behavior

## Success Criteria

This phase is successful when:

- task detail shows the new state-based SpecDown integration panel
- users can set a task folder name and see the computed folder path
- users can explore a local folder and see all discovered `.md` files with preview
- users can bind a TaskHelm project to a stubbed SpecDown project via modal
- push/pull/edit actions exist with honest phase-1 behavior
- no code changes are required in `SpecDown` to ship this phase
