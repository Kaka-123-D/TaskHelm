# Project Command And Task Refer Link Design

Date: 2026-04-16

## Goal

Simplify the `Project` and `Task` domain models so they match the current local-first TaskHelm workflow:

1. Remove `test_command` from projects everywhere.
2. Replace task `source_type` and `source_ref` with a single optional `refer_link`.
3. Show the task reference link on task detail as a clickable external link.

This is a hard cleanup. Old fields are removed from schema, models, repositories, APIs, forms, and docs.

## Scope

### In Scope

- Drop `projects.test_command` from the database schema.
- Drop `tasks.source_type` and `tasks.source_ref` from the database schema.
- Add `tasks.refer_link` as an optional string column.
- Update core models, types, repository mapping, and tests for the schema change.
- Remove `Test Command` from create/edit project forms and related API payloads.
- Replace `Source Type` and `Source Ref` with `Refer Link` in create/edit task forms.
- Validate `refer_link` as an optional URL on both the client and server.
- Render `refer_link` on task detail as an external link that opens in a new tab.
- Update docs and tests that still mention the old fields.

### Out of Scope

- Adding richer link metadata such as title fetching, previews, favicon, or provider badges.
- Supporting multiple reference links per task.
- Preserving backward compatibility with the old form fields at the API layer after migration.
- Any broader redesign of project/task forms unrelated to these fields.

## Current Problems

### Project

- `Test Command` is no longer part of the intended product direction, but it still appears in project create/edit flows.
- Keeping it in the schema and forms adds noise to the project model and UI.

### Task

- `source_type` and `source_ref` encode an older workflow concept that is now too rigid.
- Users need a simple optional URL field instead of two semi-structured fields.
- Task detail does not expose a direct external link for the related source material.

## Design

## 1. Schema Changes

### 1.1 Projects

- Remove the `test_command` column from `projects`.

### 1.2 Tasks

- Remove the `source_type` column from `tasks`.
- Remove the `source_ref` column from `tasks`.
- Add a nullable `refer_link` column to `tasks`.

### 1.3 Migration Strategy

- Use a table rewrite migration for any table that cannot safely drop columns in-place under the current SQLite strategy already used in this repo.
- Preserve all remaining task and project data.
- Old task source data is not migrated into `refer_link` because it cannot be converted reliably without guessing semantics.
- After migration:
  - old columns are gone
  - existing rows get `refer_link = NULL`

## 2. Core Model Changes

### 2.1 Project

- Remove `test_command` from:
  - project type definitions
  - repository row mapping
  - create/update input shapes
  - tests and fixtures

### 2.2 Task

- Remove `source_type` and `source_ref` from:
  - task type definitions
  - repository row mapping
  - create/update input shapes
  - tests and fixtures
- Add `refer_link?: string | null` to the task model.

## 3. Web API Changes

### 3.1 Projects API

- Create and update project endpoints no longer accept or return `test_command`.

### 3.2 Tasks API

- Create and update task endpoints no longer accept `source_type` or `source_ref`.
- They accept `refer_link` instead.
- Responses include `refer_link`.

### 3.3 Validation

- `refer_link` is optional.
- If present, it must parse as a valid absolute URL.
- Invalid values return a `400` error with a clear message.

## 4. UI Changes

## 4.1 Project Create/Edit Forms

- Remove the `Test Command` field entirely.
- Keep the rest of the project form unchanged.

## 4.2 Task Create/Edit Forms

- Remove the row containing `Source Type` and `Source Ref`.
- Replace it with one optional field:
  - label: `Refer Link`
  - placeholder: a normal URL example
- Client-side validation should prevent obvious invalid URLs before submit.

## 4.3 Task Detail

- If `refer_link` is present:
  - render a compact external link block in task detail
  - the link opens in a new tab using `target="_blank"` and `rel="noreferrer"`
- If `refer_link` is empty or null:
  - render nothing for this field

The task detail view should present the link as a useful outgoing reference, not as raw database text.

## 5. Error Handling

- Invalid `refer_link` on submit:
  - client shows a local validation message when possible
  - server still validates and rejects malformed payloads
- Empty `refer_link`:
  - normalize to `null`
- Existing tasks created before the migration:
  - load normally with no reference link section

## 6. Testing

### Core

- migration tests covering the new schema shape
- model/repository tests for:
  - projects without `test_command`
  - tasks with nullable `refer_link`
  - removal of `source_type` and `source_ref`

### Web

- project form tests ensuring `Test Command` is not rendered
- task form tests ensuring `Refer Link` is rendered and old fields are gone
- task API route tests for valid and invalid `refer_link`
- task detail tests ensuring:
  - link is rendered when present
  - link is omitted when absent
  - link opens as an external target

### Docs

- update docs and examples that still mention:
  - `test_command`
  - `source_type`
  - `source_ref`

## 7. Risks And Mitigations

### Risk: Blast Radius Across Core And Web

- The change touches schema, repositories, routes, forms, and tests.
- Mitigation:
  - execute via TDD
  - keep project and task changes tightly scoped to the removed/replaced fields
  - verify root build and targeted suites after the migration

### Risk: Old Data Semantics Lost

- Existing `source_type/source_ref` data cannot be mapped safely into one URL field.
- Mitigation:
  - accept a hard cleanup with `refer_link = NULL` for existing tasks
  - avoid fake conversions that would create misleading links

## 8. Success Criteria

- Project forms no longer show or submit `Test Command`.
- Task forms no longer show or submit `Source Type` and `Source Ref`.
- `refer_link` exists as the single optional task reference field.
- Task detail shows the reference as a clickable external link when present.
- Old schema columns are removed from the database and codebase.
