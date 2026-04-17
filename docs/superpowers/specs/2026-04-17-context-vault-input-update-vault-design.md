# Context Vault Input / Update Vault Design

Date: 2026-04-17
Owner: Codex
Status: Draft for review

## Goal

Replace the current native `showDirectoryPicker()` / `showOpenFilePicker()`-first flow in `Context Vault` with a more stable browser-native file input flow:

- folder selection via `input[type="file"][webkitdirectory]`
- file selection via `input[type="file"]`
- manual refresh via an `Update Vault` button
- preview support extended to `video` in addition to markdown, text/code, and image

This change is intentionally a local snapshot workflow, not a live local-path sync workflow.

## Why

The current File System Access picker flow is unstable on the user’s macOS setup:

- `Failed to execute 'showDirectoryPicker' on 'Window': File picker already active`
- stale fallback errors such as `Directory not found`
- fallback browser UX is brittle and visually noisy

The user prefers a more robust pick-and-refresh model, even if that means losing true live polling from the local filesystem.

## Product Decision

We are explicitly choosing **snapshot-based local vault imports** over **live path-based local vault syncing**.

Implications:

- after choosing a folder or file, `TaskHelm` stores a snapshot of the selected files in the task vault
- `TaskHelm` does **not** retain a capability to re-read those local files automatically later
- `Update Vault` means: prompt the user to reselect the file/folder and refresh the snapshot
- UI copy must stop claiming that files are auto-polled from disk every 3 seconds

## User Experience

### Explore Context Vault modal

The modal keeps the same role and overall shape, but the selection model changes:

- `Choose folder`
  - uses a hidden file input configured with `webkitdirectory`, `directory`, and `multiple`
  - imports all supported files under the chosen folder
  - preserves relative folder structure using `webkitRelativePath`
- `Choose file`
  - uses a hidden file input configured with `accept` for supported text, markdown, image, and video files
  - imports a single file snapshot
- `Use fallback browser`
  - removed from the primary workflow in this phase
  - no path browsing, no server filesystem browsing

### Update Vault

Once a task already has imported vault content, the main action changes from “Change Context Vault” semantics to a manual refresh action:

- button label: `Update Vault`
- clicking it reopens the correct picker flow
  - if current source kind is `folder`, reopen folder picker
  - if current source kind is `file`, reopen file picker
- after reselecting, the new snapshot replaces the old task vault snapshot

Important UX copy:

- make it clear that `Update Vault` refreshes the vault by reselecting the local source
- do not claim background sync or polling from local disk

### Selection persistence

Per task we continue to persist:

- vault root label
- imported file list snapshot
- selected preview file

But we no longer persist a local filesystem path as a guaranteed re-readable source of truth.

## Supported File Types

### Text-like preview

These continue to render as raw text/code:

- `.md`, `.mdx`
- `.txt`, `.json`
- `.yml`, `.yaml`
- `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`
- `.css`, `.scss`, `.html`, `.xml`
- `.sh`, `.bash`, `.zsh`, `.env`, `.log`, `.toml`, `.ini`, `.sql`, `.csv`

### Markdown preview

Markdown still renders with the current markdown preview stack:

- `react-markdown`
- `remark-gfm`
- mermaid fenced block support

### Image preview

Image files continue to preview via object/blob URLs or equivalent in-memory snapshot content:

- `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`

### Video preview

Video files become first-class preview targets:

- `.mp4`, `.webm`, `.mov`, `.m4v`

Preview UI:

- render with `<video controls playsInline>`
- use a browser object URL created from the imported `File`
- if the browser cannot preview a given codec, show a friendly “preview unavailable” message instead of failing the panel

## Context Vault Data Model

### Keep

Keep the existing task-level vault snapshot fields:

- `context_vault_root_path`
- `context_vault_files_json`
- `context_vault_selected_file`

### Behavioral reinterpretation

These fields now represent **the imported snapshot**, not an actively monitored local path source.

`context_vault_root_path` becomes a display label for the imported source root, not a reliable filesystem path for background polling.

### Remove from behavior

The following behavior is removed:

- local polling every 3 seconds
- re-reading files from disk using stored paths
- native handle/session-based “live” updates

## Preview Data Flow

### On choose

When the user picks a folder or file:

1. browser returns `FileList`
2. client filters to supported file types
3. client converts each file into a persisted snapshot entry
4. relative paths come from:
   - `webkitRelativePath` for folder import
   - file name for single-file import
5. snapshot is sent to the existing task vault persistence API
6. selected file is resolved and preview updates

### On update

When the user clicks `Update Vault`:

1. reopen the corresponding picker
2. get a fresh `FileList`
3. rebuild snapshot entries
4. replace previous vault snapshot
5. keep current selected file if it still exists in the new snapshot, otherwise fall back to the first available file

## Layout / UI Changes

### Modal

The explorer modal becomes simpler:

- no fallback filesystem browser list
- no path-derived error state from server browsing
- clear selection mode buttons
- cleaner selected source summary

### Task detail action card

Where the task already shows linked local source info:

- replace wording about background re-reads
- main action becomes `Update Vault`
- empty state still allows first import via `Explore Context Vault`

## Error Handling

### Picker cancellation

- if the user cancels file/folder selection, keep current vault unchanged
- no red error should be shown

### Empty selection

- if a selected folder contains no supported files, show a clear empty-state message
- do not overwrite existing vault snapshot unless the user explicitly completes a valid replacement

### Unsupported preview

- unknown file category: show `Preview unavailable`
- unsupported video codec: show `Preview unavailable in this browser`

## Testing

Add or update tests for:

- folder import via `webkitdirectory` file lists preserving hierarchy
- file import via single-file input
- `Update Vault` reopening the correct picker mode
- no UI copy mentioning live polling from disk
- video preview rendering for supported media entries
- existing markdown/image/text preview continuing to work
- selected file retention when the refreshed snapshot still contains that file

## Out of Scope

This phase does not include:

- live local filesystem polling
- restoring local file access after page reload without re-picking
- path-based fallback browser as a primary UX
- server-side filesystem sync from stored absolute paths
- remote sync with external systems
