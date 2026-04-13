# TaskHelm Projects List — PostHog Direction Spec

## Goal

Use the `Projects` screen as the first production screen for a new TaskHelm web direction inspired by PostHog's editor/workbench UI:

- bright workspace shell instead of dark glass
- product-tool chrome instead of dashboard glow
- warm paper tones, crisp borders, restrained accent color
- card grid remains the primary information layout

This spec defines the first screen and the baseline shell primitives that other web pages can inherit later.

## Direction

### Overall Feel

- The app should feel like a software tool opened inside a desktop editor window.
- The visual hierarchy should come from framing, borders, spacing, and typography, not bloom/glow.
- The screen should look more "product workspace" than "marketing page".

### Source Inspiration

Using `https://posthog.com/` as reference, borrow these traits:

- faux editor/browser chrome at the top
- warm off-white surfaces with subtle paper texture
- strong but friendly card borders
- orange primary CTA with blue secondary accents
- segmented, utility-first tool UI energy

Do not copy the app-library content model. TaskHelm remains a project manager.

## Scope

### In Scope

- global shell restyle for the web app layout
- token reset from dark glass to bright workbench
- `Projects` page redesign
- `ProjectCard` redesign
- `CreateProjectForm` modal/button redesign
- preserve current delete overflow menu behavior on cards

### Out Of Scope

- changing data model or routes
- replacing card grid with table view
- adding fake filters that do not map to real state
- redesigning every downstream page in this task

## Layout

### App Shell

- Wrap the web app in a centered "window" frame with rounded corners, border, and soft shadow.
- Add a top chrome row resembling an editor/browser:
  - left: small control dots / brand mark
  - center: workspace label
  - right: lightweight status or utility label
- Keep a left sidebar, but style it as part of the same bright workbench shell.

### Sidebar

- Use a warm sidebar surface slightly darker than the content area.
- Nav items should feel like utility tabs, not dark dashboard pills.
- Recent projects remain visible in a lightweight list.
- Active item should be obvious via filled pill + border.

### Main Content

- Main pane uses a bright canvas with roomy padding.
- The `Projects` page header contains:
  - small eyebrow/section label
  - `Projects` title
  - project count
  - primary `+ New Project` action
- Card grid remains responsive with 1-3 columns.

## Project Card

- Card surface: warm white with visible border, modest shadow, and compact hover lift.
- Keep reserved description height so cards stay aligned even without description.
- Keep repo path and task metadata pinned toward the lower section.
- Add small structural accents:
  - path chip or muted inline field treatment
  - task count pill
  - running status pill when relevant
- Preserve the existing overflow menu and delete flow.

## Visual System

### Palette

- base background: warm cream / paper
- shell/sidebar: sand / parchment tones
- content cards: off-white
- primary action: warm orange
- secondary accent: electric blue
- text: deep charcoal / muted slate

### Texture

- Use subtle grid/noise/paper texture in the page background.
- Keep it faint and static.
- Remove the current nebula/sparkle/dark ambient treatment from the `Projects` page.

### Typography

- Bold, straightforward headings
- smaller utility labels with uppercase or tightened tracking where useful
- monospace retained only for repo paths or technical metadata

## Motion

- Retain current page/card entrance motion, but reduce the "floaty" feel.
- Card hover should feel crisp and mechanical, not dreamy.
- Menus and modals should open quickly with short vertical motion.

## Implementation Notes

- Reuse existing component names where practical, even if `glass-*` becomes visually non-glass for now.
- Prefer token-driven restyling over one-off per-page hardcoding.
- Page-specific classes may still be used for the `Projects` screen hero/header treatment.

## Acceptance Criteria

- The web app no longer reads as a dark glass dashboard on the `Projects` screen.
- The shell clearly resembles a bright editor/workbench UI.
- `Projects` still works as a card grid manager, not a catalog.
- Cards remain aligned when description is missing.
- Overflow delete menu still works and stays correctly anchored.
- The screen feels recognizably inspired by PostHog without becoming a direct clone.
