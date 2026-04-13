# Workbench Detail Surfaces Implementation Plan

## Goal

Bring `Project detail`, `Task detail`, and `Dev Pool` into the new bright workbench design direction established on the `Projects` list screen.

## Files

### Likely Modified

- `packages/web/src/app/projects/[slug]/page.tsx`
- `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`
- `packages/web/src/app/dev-pool/page.tsx`
- `packages/web/src/app/globals.css`
- `packages/web/src/components/task-list.tsx`
- `packages/web/src/components/task-row.tsx`
- `packages/web/src/components/task-detail-panels.tsx`
- `packages/web/src/components/workspace-panel.tsx`
- `packages/web/src/components/dev-server-panel.tsx`
- `packages/web/src/components/status-badge.tsx`
- `packages/web/src/components/design-system/port-badge.tsx`
- `packages/web/src/components/design-system/breadcrumb.tsx`
- `packages/web/src/components/design-system/filter-pills.tsx`
- `packages/web/src/components/create-task-form.tsx`
- `packages/web/src/components/edit-project-form.tsx`
- `packages/web/src/components/edit-task-form.tsx`

## Steps

- [ ] Restyle shared workbench primitives used across detail pages.
- [ ] Redesign `Project detail` header and task section.
- [ ] Redesign `Task detail` hero and split workbench panes.
- [ ] Redesign `Dev Pool` header and table shell.
- [ ] Add or update tests for the new page shells where practical.
- [ ] Run tests, typecheck, build, and `gitnexus_detect_changes`.
