# Projects List PostHog Direction Implementation Plan

> Execute inline in the current session. The goal is to establish the new bright workbench shell and use `Projects` as the first standard screen.

## Goals

- replace the dark-glass home screen with a bright PostHog-like workbench direction
- keep the existing project manager information model and card grid
- preserve current behaviors: create project, open project, delete project

## Files

### Likely Modified

- `packages/web/src/app/layout.tsx`
- `packages/web/src/app/globals.css`
- `packages/web/src/app/page.tsx`
- `packages/web/src/components/glass-sidebar.tsx`
- `packages/web/src/components/project-list.tsx`
- `packages/web/src/components/project-card.tsx`
- `packages/web/src/components/create-project-form.tsx`
- `packages/web/src/components/delete-confirm.tsx`
- `packages/web/src/components/design-system/glass-button.tsx`
- `packages/web/src/components/design-system/glass-card.tsx`
- `packages/web/src/components/design-system/glass-input.tsx`
- `packages/web/src/components/design-system/glass-modal.tsx`
- `packages/web/src/styles/glass-tokens.css`
- existing tests under `packages/web/src/**/*.test.tsx`

## Steps

- [ ] Reset global tokens and shell styling to a bright warm workbench palette.
- [ ] Restyle layout chrome and sidebar so the whole app reads like an editor window.
- [ ] Redesign the `Projects` page header and grid framing.
- [ ] Redesign `ProjectCard` while preserving reserved description height and overflow delete menu.
- [ ] Restyle `CreateProjectForm` and shared design-system primitives so the screen is visually consistent.
- [ ] Update tests to assert the new shell hooks and keep existing behavior coverage.
- [ ] Run targeted tests, typecheck, build, and `gitnexus_detect_changes`.

## Verification

- `pnpm exec vitest run src/components/project-card.test.tsx src/components/project-card-menu.test.tsx src/app/page.test.tsx`
- `pnpm run typecheck`
- `npm run build`
- `gitnexus_detect_changes({ scope: "all" })`
