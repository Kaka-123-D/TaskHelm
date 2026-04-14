# Remove SpecDown Integration Design

## Goal

Remove every `SpecDown` integration point from `TaskHelm` so the product becomes a fully standalone local-first tool.

After this change:

- `TaskHelm` no longer mentions or depends on `SpecDown`
- task context is driven only by local file/folder selection plus local polling
- there is no remote bind, sync, OAuth, online edit link, or CLI surface related to `SpecDown`

## Scope

This design removes `SpecDown` from all active layers:

- SQLite schema and migrations
- core types and repositories
- web API routes
- web UI and local state machines
- CLI commands
- README and product/technical documentation
- tests that cover `SpecDown` behavior

This design keeps and refocuses the local context vault:

- local file/folder discovery
- local content persistence metadata
- local polling for source changes
- split-pane file list and preview experience

## Non-Goals

- no replacement remote integration
- no new cloud sync target
- no multi-user collaboration
- no changes inside the `SpecDown` repository

## Product Direction

`TaskHelm` becomes a standalone workspace manager for local projects and local task context.

The `Execution Surface` on task detail keeps:

- `Explore Context Vault`
- local file list
- local preview
- local polling refresh

The `Execution Surface` removes:

- `Connect SpecDown`
- `Setup Project SpecDown`
- `Push to SpecDown`
- `Pull from SpecDown`
- `Edit in SpecDown`
- any bind or remote-folder copy

## Data Model Changes

### Projects

Remove all project-level `SpecDown` fields:

- `specdown_mode`
- `specdown_project_ref`
- `specdown_project_id`
- `specdown_owner_username`
- `specdown_project_slug`

### Tasks

Remove all task-level `SpecDown` fields:

- `specdown_folder_name`
- `specdown_folder_path`
- `specdown_last_pushed_at`
- `specdown_last_pulled_at`

Keep task-level local context vault fields:

- `context_vault_root_path`
- `context_vault_sources_json`
- `context_vault_files_json`
- `context_vault_selected_file`

### App Settings

Remove the app-level integration storage introduced for `SpecDown` connect state.

If `app_settings` is only used for `SpecDown`, remove the table and repository entirely.

## Migration Strategy

The codebase currently has already introduced `SpecDown` columns in repository code and a mixed migration that also contains local context-vault fields.

To hard-delete `SpecDown` while preserving working local context-vault data:

1. Rewrite the migration set so fresh databases never create `SpecDown` columns.
2. Add a cleanup migration for existing databases that:
   - drops `SpecDown` columns from `projects`
   - drops `SpecDown` columns from `tasks`
   - preserves all `context_vault_*` columns and values
   - drops `app_settings` only if it is no longer used by anything else

Because SQLite column removal usually requires table rebuilds, the cleanup migration should rebuild affected tables explicitly rather than trying to patch columns in place.

## Core Layer

Update `@taskhelm/core` so no exported type, repository input, or row-mapping logic contains `SpecDown`.

Required outcomes:

- `Project` type contains only local project concerns
- `Task` type contains only local task and local context-vault concerns
- repositories stop reading/writing any `specdown_*` field
- core tests stop asserting `SpecDown` behavior

## Web API Changes

Delete all `SpecDown` routes:

- `/api/specdown/session`
- `/api/specdown/projects`
- `/api/projects/[slug]/specdown`
- `/api/tasks/[taskId]/specdown`

Keep and simplify local context-vault routes:

- `/api/tasks/[taskId]/context-vault`
- `/api/tasks/[taskId]/context-vault/discover`
- `/api/tasks/[taskId]/context-files`
- `/api/fs/browse`

`context-files` should stop returning any `SpecDown` metadata such as username or slug.

## Web UI Changes

### Task Detail

Refactor `TaskDetailPanels` into a local-only surface.

The header copy should talk only about local context files.

Remove:

- connection badge states
- connect modal
- project bind modal
- sync actions strip
- remote folder mapping language
- `SpecDown`-specific success or error messages

Keep:

- local file/folder exploration
- local file list
- local preview
- local polling

### Preview Behavior

Keep the richer preview that was just introduced:

- markdown render
- mermaid render
- text/code raw preview
- image preview
- split-pane layout

But remove `SpecDown`-specific asset rewriting behavior from the surrounding product model:

- no page prop named `specdownR2PublicUrl`
- no product-level dependency on `SPECDOWN_R2_PUBLIC_URL`

Markdown/image preview should only render the URL already present in content. If a link is absolute and reachable, it renders. If not, preview degrades naturally without special `SpecDown` logic.

## CLI Changes

Delete all `SpecDown` CLI commands and references.

That includes:

- command registration
- parser/help text
- README examples
- package descriptions that list `specdown`

There should be no deprecated/no-op compatibility layer. The commands disappear entirely.

## Documentation Changes

Remove or rewrite any document that positions `SpecDown` as part of the product.

Expected documentation actions:

- delete dedicated `SpecDown` strategy/spec docs
- rewrite README so `TaskHelm` is described as standalone local-first software
- remove `SpecDown` from architecture, roadmap, schema, CLI, and dashboard docs
- remove or rewrite superpowers specs/plans created only for `SpecDown` integration work if they no longer describe the intended system

If a historical note is useful, it should be phrased as prior exploration, not current architecture.

## Testing

Update tests to prove the new local-only model:

- project and task repository tests no longer mention `specdown_*`
- migration tests validate local context-vault columns but not `SpecDown`
- task detail tests assert local-only execution surface
- API tests assert no `SpecDown` metadata is returned by context routes
- CLI tests or snapshots no longer include `SpecDown` commands

## Risks

### Migration risk

Removing columns from SQLite is the highest-risk part because it requires table rebuilds. This must be covered by migration tests for both fresh and already-migrated databases.

### Scope risk

`SpecDown` currently touches multiple layers and docs. The implementation must remove references comprehensively, not just hide UI.

### Regression risk

The local context vault was recently built on top of some `SpecDown` state. The implementation must preserve:

- local persistence
- local polling
- local preview
- file discovery across supported text and image formats

## Acceptance Criteria

- searching the repo for `SpecDown`, `specdown`, and `SPECDOWN_` returns no active product code paths
- no CLI command, route, or UI flow refers to `SpecDown`
- project and task schemas contain no `specdown_*` fields
- local context vault still works end-to-end with file/folder selection and polling
- task detail still supports markdown, mermaid, text/code, and image preview
- docs describe `TaskHelm` as a standalone local-first tool
