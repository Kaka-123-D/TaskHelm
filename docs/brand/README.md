# TaskHelm Brand Assets

| File | Use for |
|---|---|
| `taskhelm-mark.svg` | Square logomark (256×256). Two-tone amber + blue. Use for app icons, social avatars, dashboard tab icon, GitHub repo OpenGraph card. |
| `taskhelm-mark-mono.svg` | Single-color version of the mark. Inherits `currentColor` so it adapts to its parent's text color — drop-in for sidebars, dark backgrounds, or print. |
| `taskhelm-logo.svg` | Horizontal lockup (600×160) — mark + "TaskHelm" wordmark. Use in README hero, slide decks, presentations, and anywhere you need brand + name together. |

## Color tokens

| Role | Value | Where it shows up |
|---|---|---|
| Primary (amber) | `#f5a623` | Mark trunk + branches + hub, "Helm" wordmark, npm version badge, GitHub stars badge |
| Secondary (blue) | `#2f6df6` | Mark task nodes, license badge, node-engine badge, dashboard link color |
| Wordmark text (charcoal) | `#1f1c14` | "Task" portion of the wordmark — readable on both cream and white backgrounds |
| Surface (cream) | `#efe5d3` | Workbench panel base color (do not paint the logo this color; this is for surrounding canvas) |

## What the mark means

- **Horizontal amber bar** — the project / repo / control plane
- **Amber hub** — TaskHelm itself, sitting on the trunk
- **Three amber branches reaching up** — parallel worktrees forking out
- **Three blue nodes at the tips** — the active tasks running in those worktrees

The shape is intentionally a stylized trident / hub-and-fork, not a literal ship's wheel — it
communicates "parallel work radiating from one control plane" at a glance, even at favicon size.

## Spacing & sizing

- **Minimum size**: the mark is legible down to 24×24 px; the wordmark lockup down to 240px wide.
- **Clearspace**: keep at least 1× the hub diameter of empty space on every side of the mark.
- **Don't**: rotate, recolor (other than swapping to the mono variant), stretch, or place blue
  nodes outside the trident geometry.
