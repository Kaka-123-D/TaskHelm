# Task Detail Responsive Layout Design

## Goal

Improve the task detail page on laptop-sized screens so the workspace controls no longer squeeze the context preview area. The desktop layout at `>= 1536px` should stay unchanged.

## Current Problem

The current task detail screen uses a two-column layout where the right-side workspace panel stays beside the context vault. On laptop widths, this leaves too little horizontal space for:

- the markdown/image preview pane
- the file list
- the visual relationship between file list and preview content

The result is that preview content looks cramped and image-heavy tasks become hard to inspect.

## Desired Behavior

### Desktop wide screens (`>= 1536px`)

Keep the current layout:

- left: context vault
- right: workspace and dev server panels

No visual regression to the current large-screen layout.

### Laptop and narrower workbench widths (`< 1536px`)

Reflow the page so:

- the right bar moves above the context vault
- the context vault takes the full width below
- preview content gets substantially more usable width

## Context Vault Responsiveness

The context vault should support two file-list modes:

### Full list mode

When the available width is sufficient:

- show the current file tree/list with names
- preserve folder hierarchy and expand/collapse behavior
- keep the preview panel beside it

### Icon rail mode

When the available width inside the context vault is too tight:

- collapse the file list into a narrow icon rail
- each file/folder item shows only its icon / type marker
- hovering an item reveals the file name via tooltip or accessible hover label
- selecting a file still works exactly as before

This rail mode should **not** be driven by a hard page breakpoint alone. It should activate only when the actual file-list pane width is insufficient.

## Layout Rules

### Task detail shell

- `>= 1536px`: keep the current `task-detail-grid` layout
- `< 1536px`: stack the panels vertically:
  - first row: workspace/dev server panels
  - second row: context vault full-width

### Workspace block

On laptop layout:

- render the workspace and dev server area above the context vault
- preserve existing form controls and behavior
- avoid introducing a second deeply nested card layer

### Context preview

- prioritize preview readability over file-list width
- keep internal scrolling behavior
- keep image preview fitting naturally inside the panel
- keep markdown preview stable without reflow jank

## Implementation Approach

### CSS/layout

- update the task detail grid breakpoint rules in `packages/web/src/app/globals.css`
- add a laptop breakpoint below `1536px` for the top/bottom reflow
- preserve the current large desktop behavior

### File list measurement

- keep the existing collapsible file list behavior
- add a lightweight width-aware mode so the component can enter icon-rail mode when its actual available width falls below a threshold
- do not rely solely on viewport width

### Hover naming

- use a minimal tooltip/title-based treatment for icon-rail items
- keep it keyboard-accessible via labels/aria text

## Non-Goals

- no draggable split-pane resizing
- no redesign of workspace form fields
- no changes to task data flow or API behavior
- no visual change to the `>=1536px` desktop layout beyond regression-safe cleanup if needed

## Testing

Add regression coverage for:

- large-screen layout preserving the existing right-sidebar arrangement
- laptop layout moving the right bar above the context vault
- file list entering icon-rail mode when the pane is too narrow
- icon-rail items exposing file names accessibly

## Risk Notes

This patch is UI-layout scoped. The main risk is accidental regression to the large-screen task detail layout. Keep the change isolated to:

- task detail page layout
- context file list presentation
- supporting CSS and responsive tests
