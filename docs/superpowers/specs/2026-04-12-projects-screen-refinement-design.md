# TaskHelm Projects Screen Refinement — Design Spec

## Goal

Refine the `Projects` page in `packages/web` to fix inconsistent project card alignment when a project has no description, and replace the flat single-gradient page background with a deeper "metaverse medium" ambient background. The result should feel more dimensional and polished without changing the existing information hierarchy or turning the screen into a flashy landing page.

## Architecture: Targeted UI Polish (Approach 3)

Keep the current page structure, routing, and data flow intact. Apply focused visual updates to:

- the page-level background treatment
- the `ProjectList` / `ProjectCard` presentation
- the supporting glass surface styling so the cards feel integrated with the new background

Do not change project data shape, API routes, navigation structure, or interaction model.

## Scope

In scope:

- `packages/web/src/app/page.tsx`
- `packages/web/src/components/project-list.tsx`
- `packages/web/src/components/project-card.tsx`
- `packages/web/src/components/design-system/glass-card.tsx`
- `packages/web/src/app/globals.css`
- `packages/web/src/styles/glass-tokens.css`

Out of scope:

- Project detail and task detail pages
- Sidebar redesign
- New data fields or backend changes
- Heavy animation or canvas/WebGL effects

## 1. Visual Direction

The chosen direction is:

- `C. Stardust Metaverse`
- intensity: `medium`
- implementation style: `Hybrid background + card polish`

This means the page background should gain depth through layered gradients, sparse sparkle/particle accents, and soft bloom, while cards receive a small elevation upgrade so they still read as the primary content layer.

The effect should be noticeable at first glance, but restrained enough that:

- the page title remains the first focal point
- the primary CTA remains clear
- project cards remain easier to read than the background

## 2. Layout Fix: Consistent Project Card Rhythm

### Current Problem

`ProjectCard` conditionally renders the description block only when `project.description` exists. This causes cards without descriptions to collapse vertically, pulling the repo path upward and breaking the baseline alignment between adjacent cards.

### Target Behavior

Every project card should reserve the same vertical slot for the description area, regardless of whether the project has a description.

Expected result:

- card titles align
- description area occupies a consistent height
- repo path sits at the same vertical offset across cards
- footer metadata (`taskCount`, `runningCount`) aligns consistently at the bottom

### Implementation Intent

Use a vertically structured card layout with an explicit reserved description region rather than relying on conditional content height.

Preferred shape:

- outer card container stretches to full available height
- content uses `flex` column layout
- description block always renders
- empty descriptions render a visually muted placeholder space, not visible fake text
- bottom metadata row is pushed down with `margin-top: auto`

The empty state for description should preserve space without implying missing data to the user.

## 3. Background System: Metaverse Medium

### Current Problem

The page currently uses a single linear gradient on `body`, which makes the screen feel flat and unfinished relative to the glass styling used elsewhere.

### Target Behavior

The `Projects` page should feel deeper and slightly luminous through a layered ambient background that reads as:

- dark base space
- subtle colored atmosphere
- sparse sparkle / particle field
- soft bloom behind content, not on top of it

### Visual Layers

The background should be composed from multiple static CSS layers:

1. Base gradient
   Use a deeper vertical or diagonal gradient as the main page foundation.

2. Ambient glow layer
   Add 2-3 soft radial glows in indigo / blue-violet ranges, positioned away from the densest text regions.

3. Sparse sparkle layer
   Add a restrained particle field using CSS gradients or repeated background patterns. Density must stay low enough that the screen still feels like an application, not a poster.

4. Static haze overlay
   Use a very soft translucent layer to blend the glows and particles into the base background if needed, but keep it static and low-contrast.

### Intensity Rules

- No fast-moving effects
- No large bright flares behind text blocks
- No dense starfield
- No high-contrast grid dominating the page
- Sparkles should be intermittent accents, not a repeated wallpaper texture

## 4. Card Polish

The project cards should be updated so they visually separate from the richer background without looking detached from the design system.

Expected refinements:

- slightly stronger depth than current cards
- subtle inner highlight or top-edge sheen
- slightly improved shadow / separation from background
- hover remains gentle and consistent with the existing glass interaction pattern

This should remain a design-system-compatible evolution of `GlassCard`, not a one-off style that only works on the home page.

## 5. Readability And Interaction Safety

The richer background must not degrade usability.

Rules:

- text contrast must remain equal to or better than the current screen
- card content must remain readable at a glance
- CTA button must remain visually distinct from the background
- sidebar should not become visually disconnected from the main content
- hover motion should stay subtle

If there is any tradeoff between atmosphere and clarity, clarity wins.

## 6. Motion

Motion should remain minimal and existing-background effects should stay static for this iteration.

Allowed:

- existing staggered card entrance
- existing hover lift

Not allowed:

- particle animation
- ambient shimmer on the background
- looping decorative motion that draws attention away from content
- anything that increases perceived latency

Static ambient effects are preferred for this iteration.

## 7. File-Level Design

### `packages/web/src/app/page.tsx`

- Add a page-level wrapper or class hook if needed to scope the richer background to the `Projects` page instead of applying it globally.
- Keep header structure and data flow unchanged.

### `packages/web/src/components/project-list.tsx`

- Ensure list items can stretch uniformly when cards use full-height layout.
- Preserve existing responsive grid behavior and stagger entrance animation.

### `packages/web/src/components/project-card.tsx`

- Convert card internals to a consistent vertical layout.
- Always render the description slot.
- Keep repo path truncation.
- Keep running status logic unchanged.

### `packages/web/src/components/design-system/glass-card.tsx`

- Adjust shared surface styling only if the change remains safe across other usages.
- If a global update would create regressions, home-page-specific polish should be scoped locally instead.

### `packages/web/src/app/globals.css`

- Add shared ambient background utility classes or page-level pseudo-element styles.
- Keep base app background stable for other screens unless the effect is intentionally generalized and visually safe.

### `packages/web/src/styles/glass-tokens.css`

- Add only the tokens needed to support the new ambient background and slightly richer surface layering.
- Avoid token sprawl.

## 8. Testing And Verification

Verification should cover:

- two project cards, one with description and one without, align correctly
- responsive behavior still looks correct at single-column and multi-column breakpoints
- text contrast remains readable on the new background
- hover state still feels smooth and not over-amplified
- no obvious visual regressions on screens that also use `GlassCard`

Suggested commands:

- `npm run build`
- `npm --workspace @taskhelm/web run typecheck`

Optional:

- visual manual check in the browser on the `Projects` page

## 9. Non-Goals

- redesigning the information architecture of the page
- changing copy or labels
- creating a reusable animated background engine
- introducing canvas, SVG particle systems, or image assets
- restyling the entire application to the stronger metaverse look in one pass

## 10. Risks And Mitigations

### Risk: background becomes too busy

Mitigation:

- keep sparkles sparse
- keep glow softness high
- bias visual energy toward the page perimeter instead of behind card text

### Risk: shared `GlassCard` changes affect other pages

Mitigation:

- prefer additive, low-risk token/shadow adjustments
- scope extra polish locally if shared styling causes mismatch elsewhere

### Risk: card height fix introduces awkward blank area

Mitigation:

- reserve only enough vertical space for the intended two-line description rhythm
- use subtle muted empty space rather than obvious placeholder copy
