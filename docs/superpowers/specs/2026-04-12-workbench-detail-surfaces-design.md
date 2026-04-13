# TaskHelm Workbench Detail Surfaces — Design Spec

## Goal

Extend the new bright TaskHelm workbench direction beyond `Projects list` into the core workflow surfaces:

- `Project detail`
- `Task detail`
- `Dev Pool`

These screens should feel like parts of the same editor/workbench product, not isolated legacy pages sitting inside a new shell.

## Direction

- Keep the shell, palette, and editor chrome established on the redesigned `Projects` page.
- Move away from plain stacked headers and generic cards.
- Use framed overview surfaces, bordered utility panels, and compact technical chips.

## Project Detail

### Layout

- Breadcrumb remains at the top, but visually lighter and more utility-like.
- The page opens with a large overview card:
  - project name
  - optional description
  - repo path
  - summary stats such as task count and running count
  - action group for `Edit project` and `+ New Task`

### Task Area

- Tasks sit inside a dedicated section shell instead of floating directly below the header.
- Filter pills should feel like tool tabs, using border/background instead of glow.
- Each task row becomes a crisp workbench row/card with:
  - status dot
  - title
  - goal snippet if present
  - status badge
  - port badge when running

## Task Detail

### Header

- The task header becomes a hero/work item sheet:
  - task title
  - status badge
  - port badge if present
  - project context copy
  - action cluster for edit/delete

### Body

- Use a stronger 2-column workbench layout:
  - left: context files list + preview
  - right: operational utility stack for workspace and dev server
- Both columns should look like framed panes inside the same editor surface.

### Panel Language

- `ContextFileList` becomes a file navigator style list.
- `ContextFilePreview` becomes a pale code/document viewer with a stronger filename rail.
- `WorkspacePanel` and `DevServerPanel` become utility modules with section labels, clearer empty states, and better error treatment.

## Dev Pool

- The page should look like a monitored operations surface instead of a bare table.
- Add a page hero with server count and explanatory copy.
- Put the table inside a framed sheet with brighter header row and cleaner row hover.
- Empty state should match the same warm workbench language as other pages.

## Shared Components

- `StatusBadge`, `PortBadge`, `Breadcrumb`, `FilterPills`, task row styling, and task/project action buttons should all align with the new warm workbench palette.
- Existing create/edit/delete behavior stays unchanged.
- Motion remains subtle and mechanical.

## Acceptance Criteria

- `Project detail`, `Task detail`, and `Dev Pool` no longer look like legacy dark-dashboard leftovers.
- The pages feel visually connected to the redesigned `Projects` list.
- Existing task/project CRUD and workspace/dev actions still work.
- The task detail split layout is easier to scan and more structured than before.
