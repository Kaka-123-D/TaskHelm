# TaskHelm Projects List Overflow Menu And Sparkle Boost — Design Spec

## Goal

Refine the `Projects` list page so the ambient background sparkle layer is visibly readable at a glance, and add a per-card overflow menu (`⋮`) that exposes project actions without cluttering the card. For this iteration, the only overflow action is `Delete project`.

## Architecture: Small UI Extension

Keep the current `Projects` list layout, data flow, and navigation model. Layer two focused UI changes on top:

- boost the existing static sparkle treatment so it is noticeable but still secondary to content
- add a lightweight overflow-menu interaction on each `ProjectCard`, reusing the existing delete-confirmation pattern instead of inventing a new deletion flow

Do not change routing, project data shape, API shape, or the meaning of clicking a card.

## Scope

In scope:

- `packages/web/src/components/project-card.tsx`
- `packages/web/src/app/globals.css`
- `packages/web/src/components/delete-confirm.tsx` if a small extension is needed for reuse
- tests covering the new overflow-menu behavior and visible hooks

Out of scope:

- edit actions in the list menu
- bulk actions on projects
- redesign of the sidebar or page header
- animated particles or decorative motion

## 1. Sparkle Boost

### Problem

The current background reads as richer than before, but the sparkle layer is still too faint to register as intentional “hạt sáng” on first glance.

### Target Behavior

The `Projects` page should show sparse but clearly perceptible light particles near the upper and mid background areas.

### Design Rules

- Keep the background static
- Increase sparkle visibility through density, contrast, and placement rather than animation
- Bias sparkles toward page perimeter and open negative space, not directly behind the card text
- Preserve the existing glow/haze treatment
- Avoid turning the page into a starfield wallpaper

### Implementation Intent

Adjust only the `Projects` page ambient layer:

- increase the number of sparkle points slightly
- raise the brightness/opacity of a subset of them
- distribute them more intentionally across visible empty space
- keep the effect subtle enough that cards and CTA still dominate

## 2. Project Card Overflow Menu

### Chosen Interaction

Use a vertical three-dot overflow trigger (`⋮`) on each project card.

Behavior:

- the icon remains visible in a muted state at the top-right of the card
- hover/focus raises its opacity so it feels discoverable without being noisy
- clicking the icon opens a small contextual menu anchored to the trigger
- the menu currently contains one action: `Delete project`

### Navigation Safety

Clicking the overflow trigger or the menu must not navigate into the project page.

Card behavior remains:

- clicking the card body navigates to the project
- clicking overflow UI only opens or uses the menu

## 3. Delete Flow

### Reuse Strategy

Do not create a new deletion flow.

Selecting `Delete project` from the overflow menu should reuse the existing `DeleteConfirm` modal pattern already used elsewhere in the app.

### Target Behavior

- user opens overflow menu
- user chooses `Delete project`
- existing confirm modal appears
- confirm action deletes project through the established path
- cancel or outside-close returns user to the list view

The copy should explicitly name the project being deleted.

## 4. Menu Behavior

The overflow menu should behave like a normal contextual action menu:

- anchored to the top-right trigger
- closes on outside click
- closes on `Escape`
- closes after action selection
- renders above the card surface cleanly

The menu should visually match the glass system already used in the page.

## 5. Accessibility And Interaction Rules

- the overflow trigger must be a real button
- it must have an accessible label
- keyboard users must be able to focus it and activate it
- the menu action must also be keyboard reachable
- destructive action styling should be clear without overwhelming the card

## 6. Testing

Verification should cover:

- sparkle-layer CSS hook still scopes only to the `Projects` page
- each project card renders an overflow trigger
- clicking overflow trigger does not activate navigation
- choosing delete opens the expected confirmation flow
- card navigation still works when clicking outside the overflow area

Suggested verification:

- targeted component tests for overflow trigger/menu behavior
- web typecheck
- build

## 7. Non-Goals

- adding multiple project actions to the menu
- editing projects from the list page
- implementing a generalized dropdown/menu framework for the entire app
- adding background animation

## 8. Risks And Mitigations

### Risk: overflow click accidentally triggers card navigation

Mitigation:

- isolate the trigger as a button
- stop event propagation intentionally on trigger and menu actions
- test this interaction explicitly

### Risk: sparkle boost reduces readability

Mitigation:

- increase sparkle visibility in empty space first
- keep text regions comparatively calm
- prefer a few brighter points over a dense field

### Risk: menu feels visually detached from the card

Mitigation:

- use the same glass border, radius, and shadow language as the existing design system
- keep spacing tight to the card corner so it reads as a card-local control
