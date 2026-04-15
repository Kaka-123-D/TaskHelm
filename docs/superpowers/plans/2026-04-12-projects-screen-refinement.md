# Projects Screen Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the inconsistent `Projects` card layout when descriptions are missing and add a deeper static "Stardust Metaverse" background with medium intensity.

**Architecture:** Keep the current home page data flow and component structure. Add a small Vitest harness for markup-level UI regression checks, update the card structure so height is stable, then layer page-scoped ambient CSS on top of the existing glass theme without changing routing or APIs.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, react-dom/server, Tailwind CSS 4, CSS custom properties, Motion

---

## File Structure

### Create

| File | Responsibility |
|------|----------------|
| `packages/web/vitest.config.ts` | Resolve `@/` imports inside Vitest so UI component tests can run |
| `packages/web/src/components/project-card.test.tsx` | Regression tests for reserved description space and full-height card cells |
| `packages/web/src/app/page.test.tsx` | Regression test for the `Projects` page shell hook used by ambient background styling |

### Modify

| File | Responsibility |
|------|----------------|
| `packages/web/src/app/page.tsx` | Add a page-scoped shell element for the richer background |
| `packages/web/src/components/project-list.tsx` | Stretch grid items so every card can fill the row height |
| `packages/web/src/components/project-card.tsx` | Reserve description height, anchor metadata to the bottom, add a page-local card surface hook |
| `packages/web/src/app/globals.css` | Add static ambient background layers for the `Projects` page and local card polish |
| `packages/web/src/styles/glass-tokens.css` | Add the small set of ambient/surface tokens needed by the refined home page |

## Preflight Notes

- GitNexus impact analysis already shows `HomePage` (`packages/web/src/app/page.tsx`) is `LOW` risk with `0` direct callers and `0` affected processes.
- GitNexus impact analysis already shows `ProjectCard` (`packages/web/src/components/project-card.tsx`) is `LOW` risk with `0` direct callers and `0` affected processes.
- `ProjectList` and `GlassCard` are not indexed in the current GitNexus snapshot. Treat them as local UI components and verify via targeted tests plus final `detect_changes`.
- Keep the background static for this iteration. No shimmer, no particle animation.

### Task 1: Add UI Regression Harness And Fix Card Structure

**Files:**
- Create: `packages/web/vitest.config.ts`
- Create: `packages/web/src/components/project-card.test.tsx`
- Modify: `packages/web/src/components/project-list.tsx`
- Modify: `packages/web/src/components/project-card.tsx`
- Test: `packages/web/src/components/project-card.test.tsx`

- [ ] **Step 1: Write the failing test and minimal Vitest config**

Create `packages/web/vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `packages/web/src/components/project-card.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Project } from '@taskhelm/core'
import { ProjectCard } from './project-card'
import { ProjectList } from './project-list'

const baseProject: Project = {
  id: 'project-1',
  slug: 'test',
  name: 'Test',
  description: 'A short description',
  local_repo_root: '/repo/test',
  default_branch: 'main',
  branch_naming_pattern: null,
  worktree_root: null,
  dev_command: null,
  install_command: null,
  test_command: null,
  max_active_dev_servers: 3,
  created_at: '2026-04-12T00:00:00.000Z',
  updated_at: '2026-04-12T00:00:00.000Z',
}

describe('ProjectCard', () => {
  it('keeps a reserved description slot when the project has no description', () => {
    const html = renderToStaticMarkup(
      <ProjectCard project={{ ...baseProject, description: null }} taskCount={1} runningCount={0} />
    )

    expect(html).toContain('data-slot="project-description"')
    expect(html).toContain('min-h-[2.75rem]')
    expect(html).toContain('aria-hidden="true"')
  })

  it('renders project list cells as full-height wrappers', () => {
    const html = renderToStaticMarkup(
      <ProjectList
        projects={[
          {
            project: baseProject,
            taskCount: 1,
            runningCount: 0,
          },
        ]}
      />
    )

    expect(html).toContain('data-slot="project-card-cell"')
    expect(html).toContain('class="h-full"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card.test.tsx
```

Expected: FAIL because `ProjectCard` does not yet render `data-slot="project-description"` with a reserved height and `ProjectList` does not yet render `data-slot="project-card-cell"`.

- [ ] **Step 3: Write the minimal implementation**

Update `packages/web/src/components/project-list.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import type { Project } from '@taskhelm/core'
import { ProjectCard } from '@/components/project-card'

interface ProjectWithCounts {
  readonly project: Project
  readonly taskCount: number
  readonly runningCount: number
}

interface ProjectListProps {
  readonly projects: readonly ProjectWithCounts[]
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg mb-2 text-[var(--text-secondary)]">No projects yet</p>
        <p className="text-sm text-[var(--text-muted)]">Click &quot;+ New Project&quot; above to get started.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 items-stretch md:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {projects.map(({ project, taskCount, runningCount }) => (
        <motion.div
          key={project.id}
          data-slot="project-card-cell"
          className="h-full"
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <ProjectCard project={project} taskCount={taskCount} runningCount={runningCount} />
        </motion.div>
      ))}
    </motion.div>
  )
}
```

Update `packages/web/src/components/project-card.tsx`:

```tsx
'use client'

import type { Project } from '@taskhelm/core'
import Link from 'next/link'
import { GlassCard } from '@/components/design-system/glass-card'
import { StatusDot } from '@/components/design-system/status-dot'

interface ProjectCardProps {
  readonly project: Project
  readonly taskCount: number
  readonly runningCount: number
}

export function ProjectCard({ project, taskCount, runningCount }: ProjectCardProps) {
  const description = project.description?.trim() ?? ''

  return (
    <Link href={`/projects/${project.slug}`} className="block h-full">
      <GlassCard className="project-card-surface h-full p-5 flex flex-col">
        <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)]">{project.name}</h3>
        <p
          data-slot="project-description"
          aria-hidden={description ? undefined : true}
          className={`mb-3 min-h-[2.75rem] text-sm leading-5 ${
            description ? 'text-[var(--text-secondary)] line-clamp-2' : 'opacity-0'
          }`}
        >
          {description || '\u00A0'}
        </p>
        <div className="mb-3 truncate text-xs font-mono text-[var(--text-muted)]">
          {project.local_repo_root}
        </div>
        <div className="mt-auto flex items-center gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">{taskCount} tasks</span>
          {runningCount > 0 && (
            <span className="flex items-center gap-1.5">
              <StatusDot status="running" />
              <span className="text-[var(--primary)]">{runningCount} running</span>
            </span>
          )}
        </div>
      </GlassCard>
    </Link>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card.test.tsx
```

Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/vitest.config.ts packages/web/src/components/project-card.test.tsx packages/web/src/components/project-list.tsx packages/web/src/components/project-card.tsx && git commit -m "test(web): lock projects card layout structure"
```

### Task 2: Add The Page Shell Hook And Static Ambient Background

**Files:**
- Create: `packages/web/src/app/page.test.tsx`
- Modify: `packages/web/src/app/page.tsx`
- Modify: `packages/web/src/app/globals.css`
- Modify: `packages/web/src/styles/glass-tokens.css`
- Test: `packages/web/src/app/page.test.tsx`

- [ ] **Step 1: Write the failing page-shell test**

Create `packages/web/src/app/page.test.tsx`:

```tsx
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/lib/db', () => ({
  getDb: () => ({}),
}))

vi.mock('@taskhelm/core', () => ({
  ProjectRepository: class {
    findAll() {
      return []
    }
  },
  TaskRepository: class {
    findByProjectId() {
      return []
    }
  },
}))

vi.mock('@/components/project-list', () => ({
  ProjectList: () => <div data-slot="project-list" />,
}))

vi.mock('@/components/create-project-form', () => ({
  CreateProjectForm: () => <button type="button">+ New Project</button>,
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

import HomePage from './page'

describe('HomePage', () => {
  it('renders a dedicated shell hook for projects ambient styling', () => {
    const html = renderToStaticMarkup(<HomePage />)

    expect(html).toContain('data-slot="projects-page-shell"')
    expect(html).toContain('class="projects-page-shell"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/app/page.test.tsx
```

Expected: FAIL because `HomePage` does not yet render the dedicated `projects-page-shell` wrapper.

- [ ] **Step 3: Write the minimal implementation**

Update `packages/web/src/app/page.tsx`:

```tsx
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { ProjectList } from '@/components/project-list'
import { CreateProjectForm } from '@/components/create-project-form'
import { PageTransition } from '@/components/page-transition'

export default function HomePage() {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)
  const projects = projectRepo.findAll()

  const projectsWithCounts = projects.map(project => {
    const tasks = taskRepo.findByProjectId(project.id)
    return {
      project,
      taskCount: tasks.length,
      runningCount: tasks.filter(t => t.status === 'running').length,
    }
  })

  return (
    <PageTransition>
      <section data-slot="projects-page-shell" className="projects-page-shell">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Projects</h2>
            <span className="text-sm text-[var(--text-muted)]">{projects.length} project(s)</span>
          </div>
          <CreateProjectForm />
        </div>
        <ProjectList projects={projectsWithCounts} />
      </section>
    </PageTransition>
  )
}
```

Update `packages/web/src/styles/glass-tokens.css` by appending:

```css
  --bg-void: #090713;
  --ambient-indigo: rgba(129, 140, 248, 0.18);
  --ambient-cyan: rgba(56, 189, 248, 0.12);
  --ambient-pink: rgba(236, 72, 153, 0.11);
  --sparkle-bright: rgba(255, 255, 255, 0.8);
  --sparkle-soft: rgba(165, 180, 252, 0.36);
  --surface-highlight: rgba(255, 255, 255, 0.08);
  --card-shadow-ambient: 0 24px 64px rgba(5, 3, 18, 0.42);
```

Update `packages/web/src/app/globals.css`:

```css
@import "tailwindcss";
@import "../styles/glass-tokens.css";

body {
  background:
    linear-gradient(160deg, var(--bg-base) 0%, var(--bg-deep) 56%, var(--bg-void) 100%);
  min-height: 100vh;
  color: var(--text-primary);
}

.projects-page-shell {
  position: relative;
  isolation: isolate;
}

.projects-page-shell::before {
  content: "";
  position: absolute;
  inset: -3rem -2rem auto;
  height: min(32rem, 65vh);
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 24%, var(--ambient-indigo), transparent 24%),
    radial-gradient(circle at 78% 18%, var(--ambient-pink), transparent 20%),
    radial-gradient(circle at 58% 72%, var(--ambient-cyan), transparent 24%);
  filter: blur(12px);
}

.projects-page-shell::after {
  content: "";
  position: absolute;
  inset: -2rem 0 auto;
  height: min(30rem, 62vh);
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(circle at 14% 20%, var(--sparkle-bright) 0 1px, transparent 2px),
    radial-gradient(circle at 30% 12%, var(--sparkle-soft) 0 1px, transparent 2px),
    radial-gradient(circle at 64% 18%, var(--sparkle-bright) 0 1px, transparent 2px),
    radial-gradient(circle at 78% 34%, var(--sparkle-soft) 0 1px, transparent 2px),
    radial-gradient(circle at 86% 14%, var(--sparkle-bright) 0 1px, transparent 2px),
    radial-gradient(circle at 56% 68%, var(--sparkle-soft) 0 1px, transparent 2px);
  opacity: 0.55;
}

.project-card-surface {
  box-shadow: var(--card-shadow-ambient);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
}

.project-card-surface::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: linear-gradient(180deg, var(--surface-highlight), transparent 42%);
  mask: linear-gradient(180deg, rgba(255, 255, 255, 0.85), transparent 58%);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/app/page.test.tsx
```

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/app/page.test.tsx packages/web/src/app/page.tsx packages/web/src/app/globals.css packages/web/src/styles/glass-tokens.css && git commit -m "feat(web): add projects ambient background polish"
```

### Task 3: Verify The Slice End-To-End And Commit The Final Diff

**Files:**
- Review: `packages/web/src/app/page.tsx`
- Review: `packages/web/src/components/project-list.tsx`
- Review: `packages/web/src/components/project-card.tsx`
- Review: `packages/web/src/app/globals.css`
- Review: `packages/web/src/styles/glass-tokens.css`
- Review: `packages/web/src/components/project-card.test.tsx`
- Review: `packages/web/src/app/page.test.tsx`

- [ ] **Step 1: Run all targeted web tests together**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm exec vitest run src/components/project-card.test.tsx src/app/page.test.tsx
```

Expected: PASS with `3 passed`.

- [ ] **Step 2: Run web typecheck**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm/packages/web && pnpm run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
cd /Users/vantienkhai/Documents/TaskHelm && npm run build
```

Expected: PASS with the `@taskhelm/web` build succeeding.

- [ ] **Step 4: Review the changed scope with GitNexus**

Run `detect_changes` for the whole worktree and confirm the changed symbols and affected flows stay limited to the expected home-page UI slice:

```text
gitnexus_detect_changes({ repo: "TaskHelm", scope: "all" })
```

Expected:

- changed files limited to the plan's target files
- changed symbols centered on `HomePage` and `ProjectCard`
- no unexpected execution-flow impact outside the web UI slice

- [ ] **Step 5: Commit the verified refinement**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/vitest.config.ts packages/web/src/components/project-card.test.tsx packages/web/src/app/page.test.tsx packages/web/src/app/page.tsx packages/web/src/components/project-list.tsx packages/web/src/components/project-card.tsx packages/web/src/app/globals.css packages/web/src/styles/glass-tokens.css && git commit -m "feat(web): refine projects page layout and ambient background"
```
