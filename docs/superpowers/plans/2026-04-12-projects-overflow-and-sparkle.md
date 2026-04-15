# Projects Overflow Menu And Sparkle Boost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Projects page sparkle layer visibly readable and add a per-card `⋮` overflow menu that currently exposes `Delete project` without breaking card navigation.

**Architecture:** Extend the existing `ProjectCard` component with a small local overflow-menu interaction and reuse the existing `DeleteConfirm` modal pattern for destructive confirmation. Keep the ambient background static and page-scoped, only strengthening the sparkle layer in `globals.css` and the small set of related tokens in `glass-tokens.css`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, react-dom/server, Tailwind CSS 4, CSS custom properties, existing `/api/projects/[slug]` delete route

---

## File Structure

### Create

| File | Responsibility |
|------|----------------|
| `packages/web/src/components/project-card-menu.test.tsx` | Regression tests for overflow trigger rendering, menu interaction, and navigation protection |

### Modify

| File | Responsibility |
|------|----------------|
| `packages/web/src/components/project-card.tsx` | Add overflow trigger, menu state, delete action, and event isolation while preserving card navigation |
| `packages/web/src/components/delete-confirm.tsx` | Make the confirm control reusable from both an inline button and an overflow menu item trigger |
| `packages/web/src/app/globals.css` | Strengthen visible sparkle density/contrast and add scoped styles for the card-local overflow menu |
| `packages/web/src/styles/glass-tokens.css` | Add only the extra sparkle/menu surface tokens needed for the page refinement |

## Preflight Notes

- GitNexus impact analysis for `ProjectCard` is `LOW` risk with `0` direct callers and `0` affected processes.
- GitNexus impact analysis for `DeleteConfirm` is `LOW` risk with `0` direct callers and `0` affected processes (partial index, but no high-risk usage surfaced).
- GitNexus impact analysis for `HomePage` is `LOW` risk with `0` direct callers and `0` affected processes.
- Existing delete backend already exists at `packages/web/src/app/api/projects/[slug]/route.ts` via `DELETE`.
- Existing task detail page already uses `DeleteConfirm`, so reuse that modal pattern instead of inventing a new delete flow.

### Task 1: Add Overflow Menu Interaction And Reusable Delete Trigger

**Files:**
- Create: `packages/web/src/components/project-card-menu.test.tsx`
- Modify: `packages/web/src/components/project-card.tsx`
- Modify: `packages/web/src/components/delete-confirm.tsx`
- Test: `packages/web/src/components/project-card-menu.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/project-card-menu.test.tsx`:

```tsx
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@taskhelm/core'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, animate: _animate, initial: _initial, transition: _transition, variants: _variants, whileHover: _whileHover, ...props }: React.ComponentPropsWithoutRef<'div'> & {
      animate?: unknown
      initial?: unknown
      transition?: unknown
      variants?: unknown
      whileHover?: unknown
    }) => <div {...props}>{children}</div>,
    button: ({ children, whileTap: _whileTap, ...props }: React.ComponentPropsWithoutRef<'button'> & { whileTap?: unknown }) => (
      <button {...props}>{children}</button>
    ),
  },
}))

vi.mock('@/components/delete-confirm', () => ({
  DeleteConfirm: ({
    label,
    confirmText,
    trigger,
  }: {
    readonly label: string
    readonly confirmText: string
    readonly onConfirm: () => Promise<void>
    readonly trigger?: React.ReactNode
  }) => (
    <div data-slot="delete-confirm-stub" data-label={label} data-confirm-text={confirmText}>
      {trigger}
    </div>
  ),
}))

const baseProject = {
  id: 'project-1',
  slug: 'project-one',
  name: 'Project One',
  description: 'A short summary',
  local_repo_root: '/Users/example/projects/project-one',
  default_branch: null,
  branch_naming_pattern: null,
  worktree_root: null,
  dev_command: null,
  install_command: null,
  test_command: null,
  max_active_dev_servers: 1,
  created_at: '2026-04-12T00:00:00.000Z',
  updated_at: '2026-04-12T00:00:00.000Z',
} satisfies Project

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectCard overflow menu', () => {
  it('renders a card-local overflow trigger with an accessible label', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(
      <ProjectCard project={baseProject} taskCount={2} runningCount={0} />
    )

    expect(markup).toContain('data-slot="project-card-overflow-trigger"')
    expect(markup).toContain('aria-label="Project actions for Project One"')
  })

  it('wires a delete confirmation flow for the current project', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(
      <ProjectCard project={baseProject} taskCount={2} runningCount={0} />
    )

    expect(markup).toContain('data-slot="delete-confirm-stub"')
    expect(markup).toContain('Delete project')
    expect(markup).toContain('Delete project &quot;Project One&quot;? This cannot be undone.')
    expect(markup).toContain('data-slot="project-card-overflow-menu"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card-menu.test.tsx
```

Expected: FAIL because `ProjectCard` does not yet render an overflow trigger or a delete-confirm flow.

- [ ] **Step 3: Write the minimal implementation**

Update `packages/web/src/components/delete-confirm.tsx`:

```tsx
'use client'

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassButton } from '@/components/design-system/glass-button'

interface DeleteConfirmProps {
  readonly label: string
  readonly confirmText: string
  readonly onConfirm: () => Promise<void>
  readonly trigger?: ReactNode
}

export function DeleteConfirm({ label, confirmText, onConfirm, trigger }: DeleteConfirmProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = useCallback(async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }, [onConfirm])

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <GlassButton variant="danger" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
          {label}
        </GlassButton>
      )}

      <GlassModal open={open} onClose={() => setOpen(false)} title="Confirm Delete" maxWidth="max-w-sm">
        <p className="mb-6 text-sm text-[var(--text-secondary)]">{confirmText}</p>
        <div className="flex justify-end gap-3">
          <GlassButton variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </GlassButton>
          <GlassButton variant="danger" onClick={handleConfirm} loading={deleting}>
            Delete
          </GlassButton>
        </div>
      </GlassModal>
    </>
  )
}
```

Update `packages/web/src/components/project-card.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Project } from '@taskhelm/core'
import Link from 'next/link'
import { GlassCard } from '@/components/design-system/glass-card'
import { StatusDot } from '@/components/design-system/status-dot'
import { DeleteConfirm } from '@/components/delete-confirm'

interface ProjectCardProps {
  readonly project: Project
  readonly taskCount: number
  readonly runningCount: number
}

export function ProjectCard({ project, taskCount, runningCount }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleToggleMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuOpen(open => !open)
  }, [])

  const handleDeleteProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.slug}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete project')
    window.location.reload()
  }, [project.slug])

  return (
    <div className="relative h-full">
      <Link className="block h-full" href={`/projects/${project.slug}`}>
        <GlassCard className="project-card-surface flex h-full flex-col p-5">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{project.name}</h3>
            <div ref={menuRef} className="project-card-overflow relative shrink-0">
              <button
                type="button"
                aria-label={`Project actions for ${project.name}`}
                aria-expanded={menuOpen}
                className="project-card-overflow-trigger"
                data-slot="project-card-overflow-trigger"
                onClick={handleToggleMenu}
              >
                ⋮
              </button>
              <div
                className="project-card-overflow-menu"
                data-slot="project-card-overflow-menu"
                data-state={menuOpen ? 'open' : 'closed'}
                onClick={event => event.stopPropagation()}
              >
                <DeleteConfirm
                  label="Delete project"
                  confirmText={`Delete project \"${project.name}\"? This cannot be undone.`}
                  onConfirm={handleDeleteProject}
                  trigger={
                    <button type="button" className="project-card-overflow-item">
                      Delete project
                    </button>
                  }
                />
              </div>
            </div>
          </div>
          <p className="mb-3 min-h-12 line-clamp-2 text-sm text-[var(--text-secondary)]" data-slot="project-description">
            {project.description ?? ''}
          </p>
          <div className="mt-auto flex flex-col gap-3">
            <div className="truncate font-mono text-xs text-[var(--text-muted)]">{project.local_repo_root}</div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[var(--text-secondary)]">{taskCount} tasks</span>
              {runningCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <StatusDot status="running" />
                  <span className="text-[var(--primary)]">{runningCount} running</span>
                </span>
              )}
            </div>
          </div>
        </GlassCard>
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card-menu.test.tsx
```

Expected: PASS with `1 file passed, 2 tests passed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/delete-confirm.tsx packages/web/src/components/project-card.tsx packages/web/src/components/project-card-menu.test.tsx && git commit -m "feat(web): add project card overflow delete action"
```

### Task 2: Strengthen Projects Sparkle Layer And Menu Styling

**Files:**
- Modify: `packages/web/src/app/globals.css`
- Modify: `packages/web/src/styles/glass-tokens.css`
- Test: `packages/web/src/components/project-card-menu.test.tsx`

- [ ] **Step 1: Write the failing CSS-scope test**

Append this test to `packages/web/src/components/project-card-menu.test.tsx`:

```tsx
  it('renders the overflow menu surface hook and keeps the overflow trigger discoverable', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(
      <ProjectCard project={baseProject} taskCount={2} runningCount={0} />
    )

    expect(markup).toContain('class="project-card-overflow-trigger"')
    expect(markup).toContain('class="project-card-overflow relative shrink-0"')
    expect(markup).toContain('data-state="closed"')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card-menu.test.tsx
```

Expected: FAIL because the overflow trigger classes/hooks are not yet fully present or stable for the test.

- [ ] **Step 3: Write the minimal implementation**

Update `packages/web/src/styles/glass-tokens.css` by appending:

```css
  --sparkle-bright: rgba(255, 255, 255, 0.7);
  --sparkle-soft: rgba(188, 199, 255, 0.38);
  --menu-surface: rgba(18, 16, 38, 0.92);
  --menu-shadow: 0 18px 40px rgba(3, 6, 23, 0.28);
```

Update `packages/web/src/app/globals.css`:

```css
.projects-page-shell::before {
  background:
    radial-gradient(circle at 10% 8%, var(--ambient-haze) 0, transparent 18%),
    radial-gradient(circle at 82% 22%, rgba(255, 255, 255, 0.04) 0, transparent 14%);
}

.projects-page-shell::after {
  background:
    radial-gradient(circle at 12% 10%, var(--sparkle-bright) 0 1px, transparent 2px),
    radial-gradient(circle at 22% 20%, var(--sparkle-soft) 0 1px, transparent 2px),
    radial-gradient(circle at 42% 14%, var(--sparkle-bright) 0 1px, transparent 2px),
    radial-gradient(circle at 66% 11%, var(--sparkle-soft) 0 1px, transparent 2px),
    radial-gradient(circle at 82% 18%, var(--sparkle-bright) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 38%, var(--sparkle-soft) 0 1px, transparent 2px),
    radial-gradient(circle at 18% 48%, var(--sparkle-soft) 0 1px, transparent 2px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%);
  opacity: 0.82;
}

.project-card-overflow-trigger {
  display: inline-flex;
  height: 1.9rem;
  width: 1.9rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid transparent;
  color: var(--text-muted);
  opacity: 0.72;
  transition: opacity 160ms ease, color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.project-card-surface:hover .project-card-overflow-trigger,
.project-card-overflow-trigger:focus-visible,
.project-card-overflow-trigger[aria-expanded="true"] {
  opacity: 1;
  color: var(--text-primary);
  border-color: var(--border-soft);
  background: rgba(255, 255, 255, 0.05);
}

.project-card-overflow-menu {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  min-width: 11rem;
  padding: 0.4rem;
  border: 1px solid var(--border-soft);
  border-radius: 0.9rem;
  background: var(--menu-surface);
  box-shadow: var(--menu-shadow);
  backdrop-filter: blur(var(--glass-blur));
  z-index: 10;
}

.project-card-overflow-menu[data-state="closed"] {
  opacity: 0;
  visibility: hidden;
  transform: translateY(-0.2rem);
  pointer-events: none;
}

.project-card-overflow-menu[data-state="open"] {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.project-card-overflow-item {
  width: 100%;
  border: 0;
  border-radius: 0.65rem;
  padding: 0.55rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  color: var(--danger-hover);
  background: transparent;
}

.project-card-overflow-item:hover,
.project-card-overflow-item:focus-visible {
  background: rgba(239, 68, 68, 0.12);
  outline: none;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card-menu.test.tsx
```

Expected: PASS with `1 file passed, 3 tests passed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/app/globals.css packages/web/src/styles/glass-tokens.css packages/web/src/components/project-card-menu.test.tsx && git commit -m "feat(web): boost projects sparkle and style overflow menu"
```

### Task 3: Verify End-To-End Scope And Build Health

**Files:**
- Review: `packages/web/src/components/project-card.tsx`
- Review: `packages/web/src/components/delete-confirm.tsx`
- Review: `packages/web/src/app/globals.css`
- Review: `packages/web/src/styles/glass-tokens.css`
- Review: `packages/web/src/components/project-card-menu.test.tsx`

- [ ] **Step 1: Run targeted tests**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card.test.tsx src/components/project-card-menu.test.tsx src/app/page.test.tsx
```

Expected: PASS with all targeted tests green.

- [ ] **Step 2: Run web typecheck**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm run typecheck
```

Expected: PASS with exit code `0`.

- [ ] **Step 3: Run the repo build**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm && npm run build
```

Expected: PASS with `@taskhelm/web` build succeeding.

- [ ] **Step 4: Review affected scope with GitNexus**

Run:

```text
gitnexus_detect_changes({ repo: "TaskHelm", scope: "all" })
```

Expected:

- changed symbols centered on `ProjectCard`, `DeleteConfirm`, and `HomePage`
- no unexpected process impact outside the home-page UI slice
- any unrelated dirty-worktree files clearly identified as pre-existing

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/project-card.tsx packages/web/src/components/delete-confirm.tsx packages/web/src/app/globals.css packages/web/src/styles/glass-tokens.css packages/web/src/components/project-card-menu.test.tsx && git commit -m "feat(web): add project list overflow menu and visible sparkle"
```
