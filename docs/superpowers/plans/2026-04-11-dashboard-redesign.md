# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the TaskHelm web dashboard with Soft Glass visual identity, Motion animations, and a simplified feature set (no agent/review/notification UI).

**Architecture:** Incremental reskin — keep existing API routes and data layer, rewrite all UI components and pages with new design system. Remove agent/notification/review UI. Add Motion animations and SpecDown context-file viewing.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Motion (framer-motion v11+), SQLite via `@taskhelm/core`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `packages/web/src/styles/glass-tokens.css` | CSS custom properties for Soft Glass design system |
| `packages/web/src/components/design-system/glass-card.tsx` | Glassmorphism container with blur + border + hover glow |
| `packages/web/src/components/design-system/glass-button.tsx` | Button with primary/secondary/ghost/danger variants |
| `packages/web/src/components/design-system/glass-input.tsx` | Text input with glass background |
| `packages/web/src/components/design-system/glass-select.tsx` | Select dropdown with glass styling |
| `packages/web/src/components/design-system/glass-modal.tsx` | Overlay modal with backdrop blur + Motion entrance |
| `packages/web/src/components/design-system/status-dot.tsx` | Small circle with status color + glow for running |
| `packages/web/src/components/design-system/port-badge.tsx` | Monospace port display with indigo background |
| `packages/web/src/components/design-system/filter-pills.tsx` | Horizontal group of clickable pills with animated active state |
| `packages/web/src/components/design-system/breadcrumb.tsx` | Navigation path with clickable segments |
| `packages/web/src/components/glass-sidebar.tsx` | 220px expanded sidebar with nav + recent projects |
| `packages/web/src/components/page-transition.tsx` | AnimatePresence wrapper for route transitions |
| `packages/web/src/components/project-list.tsx` | Grid of project cards for home page |
| `packages/web/src/components/task-list.tsx` | Filtered list of task rows for project detail |
| `packages/web/src/components/task-detail-panels.tsx` | Split panel layout: context files left, workspace/dev right |
| `packages/web/src/components/context-file-list.tsx` | List of markdown files with SpecDown links |
| `packages/web/src/components/context-file-preview.tsx` | Rendered markdown preview panel |
| `packages/web/src/components/workspace-panel.tsx` | Branch/worktree info + init/cleanup buttons (glass styled) |
| `packages/web/src/components/dev-server-panel.tsx` | Port input + start/stop + status (glass styled) |
| `packages/web/src/app/api/tasks/[taskId]/context-files/route.ts` | Read markdown files from task capsule directory |

### Modified Files
| File | Changes |
|------|---------|
| `packages/web/src/app/globals.css` | Import glass-tokens.css, set gradient background |
| `packages/web/src/app/layout.tsx` | Replace nav with GlassSidebar, remove NotificationCenter/ActivityFeed |
| `packages/web/src/app/page.tsx` | Rewrite with glass-styled project grid + breadcrumb |
| `packages/web/src/app/projects/[slug]/page.tsx` | Rewrite with task list view + filter pills |
| `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx` | Rewrite with split panel task detail |
| `packages/web/src/app/dev-pool/page.tsx` | Restyle with glass design |
| `packages/web/src/components/status-badge.tsx` | Restyle with Soft Glass colors + glow |
| `packages/web/src/components/project-card.tsx` | Restyle with GlassCard + Motion hover |
| `packages/web/src/components/create-project-form.tsx` | Restyle with GlassModal + GlassInput |
| `packages/web/src/components/create-task-form.tsx` | Restyle with GlassModal + GlassInput |
| `packages/web/src/components/edit-project-form.tsx` | Restyle with GlassModal + GlassInput |
| `packages/web/src/components/edit-task-form.tsx` | Restyle with GlassModal + GlassInput |
| `packages/web/src/components/delete-confirm.tsx` | Restyle with GlassModal |
| `packages/web/src/components/folder-picker.tsx` | Restyle with glass components |
| `packages/web/src/components/task-row.tsx` | Rewrite as horizontal row with status dot + badge + port |
| `packages/web/package.json` | Add `motion` dependency |

### Removed Files
| File | Reason |
|------|--------|
| `packages/web/src/components/activity-feed.tsx` | Agent feature removed |
| `packages/web/src/components/agent-run-list.tsx` | Agent feature removed |
| `packages/web/src/components/dispatch-agent-form.tsx` | Agent feature removed |
| `packages/web/src/components/notification-center.tsx` | Notification feature removed |
| `packages/web/src/components/review-pipeline.tsx` | Review pipeline removed |
| `packages/web/src/components/task-cockpit.tsx` | Replaced by task-detail-panels |
| `packages/web/src/components/task-board.tsx` | Replaced by task-list |
| `packages/web/src/components/task-actions.tsx` | Inlined into task detail page |
| `packages/web/src/components/project-actions.tsx` | Inlined into project detail page |
| `packages/web/src/components/task-status-select.tsx` | Inlined into task detail |
| `packages/web/src/components/workspace-controls.tsx` | Replaced by workspace-panel |
| `packages/web/src/components/dev-server-controls.tsx` | Replaced by dev-server-panel |
| `packages/web/src/app/api/tasks/[taskId]/agent/route.ts` | Agent feature removed |
| `packages/web/src/app/api/notifications/route.ts` | Notification feature removed |
| `packages/web/src/app/api/events/route.ts` | Events feed removed |
| `packages/web/src/lib/use-events.ts` | SSE hook removed |

---

### Task 1: Install Motion + Set Up Glass Design Tokens

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/styles/glass-tokens.css`
- Modify: `packages/web/src/app/globals.css`

- [ ] **Step 1: Install motion dependency**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web add motion
```

- [ ] **Step 2: Create glass design tokens CSS file**

Create `packages/web/src/styles/glass-tokens.css`:

```css
:root {
  /* Backgrounds */
  --bg-base: #0c0a1a;
  --bg-deep: #1a1333;

  /* Surfaces */
  --surface: rgba(255, 255, 255, 0.04);
  --surface-hover: rgba(255, 255, 255, 0.07);
  --surface-active: rgba(255, 255, 255, 0.1);

  /* Borders */
  --border: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.12);

  /* Primary */
  --primary: #818cf8;
  --primary-hover: #a5b4fc;
  --primary-muted: rgba(99, 102, 241, 0.15);
  --primary-glow: rgba(129, 140, 248, 0.4);

  /* Text */
  --text-primary: #e2e0ff;
  --text-secondary: #8b85b0;
  --text-muted: #6b6194;

  /* Status */
  --status-draft: #4b5563;
  --status-ready: #f59e0b;
  --status-running: #818cf8;
  --status-reviewing: #f59e0b;
  --status-blocked: #ef4444;
  --status-done: #34d399;
  --status-archived: #6b7280;

  /* Status backgrounds */
  --status-draft-bg: rgba(75, 85, 99, 0.15);
  --status-ready-bg: rgba(245, 158, 11, 0.15);
  --status-running-bg: rgba(99, 102, 241, 0.15);
  --status-reviewing-bg: rgba(245, 158, 11, 0.15);
  --status-blocked-bg: rgba(239, 68, 68, 0.15);
  --status-done-bg: rgba(52, 211, 153, 0.15);
  --status-archived-bg: rgba(107, 114, 128, 0.15);

  /* Danger */
  --danger: #ef4444;
  --danger-hover: #fca5a5;
  --danger-bg: rgba(239, 68, 68, 0.15);

  /* Glass effect */
  --glass-blur: 12px;
  --glass-radius: 12px;
  --glass-radius-sm: 8px;
  --glass-radius-lg: 16px;
}
```

- [ ] **Step 3: Update globals.css with token import and gradient background**

Replace contents of `packages/web/src/app/globals.css`:

```css
@import "tailwindcss";
@import "../styles/glass-tokens.css";

body {
  background: linear-gradient(135deg, var(--bg-base) 0%, var(--bg-deep) 100%);
  min-height: 100vh;
  color: var(--text-primary);
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/package.json packages/web/src/styles/glass-tokens.css packages/web/src/app/globals.css pnpm-lock.yaml && git commit -m "feat(web): install motion + add Soft Glass design tokens"
```

---

### Task 2: Design System — GlassCard + GlassButton

**Files:**
- Create: `packages/web/src/components/design-system/glass-card.tsx`
- Create: `packages/web/src/components/design-system/glass-button.tsx`

- [ ] **Step 1: Create GlassCard component**

Create `packages/web/src/components/design-system/glass-card.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface GlassCardProps {
  readonly children: ReactNode
  readonly className?: string
  readonly hover?: boolean
  readonly onClick?: () => void
}

export function GlassCard({ children, className = '', hover = true, onClick }: GlassCardProps) {
  return (
    <motion.div
      className={`
        rounded-[var(--glass-radius)] border border-[var(--border)]
        bg-[var(--surface)] backdrop-blur-[var(--glass-blur)]
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Create GlassButton component**

Create `packages/web/src/components/design-system/glass-button.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode
  readonly variant?: Variant
  readonly loading?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white',
  secondary: 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-primary)]',
  ghost: 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  danger: 'bg-[var(--danger-bg)] hover:bg-[rgba(239,68,68,0.25)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-hover)]',
}

export function GlassButton({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      className={`
        px-4 py-2 rounded-[var(--glass-radius-sm)] text-sm font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
      whileTap={{ scale: 0.97 }}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </motion.button>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/design-system/ && git commit -m "feat(web): add GlassCard + GlassButton design system components"
```

---

### Task 3: Design System — GlassInput + GlassSelect + GlassModal

**Files:**
- Create: `packages/web/src/components/design-system/glass-input.tsx`
- Create: `packages/web/src/components/design-system/glass-select.tsx`
- Create: `packages/web/src/components/design-system/glass-modal.tsx`

- [ ] **Step 1: Create GlassInput component**

Create `packages/web/src/components/design-system/glass-input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string
}

export function GlassInput({ label, className = '', id, ...props }: GlassInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs text-[var(--text-muted)] mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2 rounded-[var(--glass-radius-sm)]
          bg-[var(--surface)] border border-[var(--border)]
          text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
          focus:outline-none focus:border-[var(--primary)]
          transition-colors
          ${className}
        `}
        {...props}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create GlassSelect component**

Create `packages/web/src/components/design-system/glass-select.tsx`:

```tsx
import type { SelectHTMLAttributes } from 'react'

interface Option {
  readonly value: string
  readonly label: string
}

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string
  readonly options: readonly Option[]
}

export function GlassSelect({ label, options, className = '', id, ...props }: GlassSelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-xs text-[var(--text-muted)] mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-[var(--glass-radius-sm)]
          bg-[var(--surface)] border border-[var(--border)]
          text-sm text-[var(--text-primary)]
          focus:outline-none focus:border-[var(--primary)]
          transition-colors
          ${className}
        `}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 3: Create GlassModal component**

Create `packages/web/src/components/design-system/glass-modal.tsx`:

```tsx
'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface GlassModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
  readonly maxWidth?: string
}

export function GlassModal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: GlassModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            className={`
              relative ${maxWidth} w-full mx-4
              bg-[var(--bg-deep)] border border-[var(--border-hover)]
              rounded-[var(--glass-radius-lg)] p-6 shadow-2xl
            `}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/design-system/ && git commit -m "feat(web): add GlassInput + GlassSelect + GlassModal components"
```

---

### Task 4: Design System — StatusBadge + StatusDot + PortBadge + FilterPills + Breadcrumb

**Files:**
- Modify: `packages/web/src/components/status-badge.tsx`
- Create: `packages/web/src/components/design-system/status-dot.tsx`
- Create: `packages/web/src/components/design-system/port-badge.tsx`
- Create: `packages/web/src/components/design-system/filter-pills.tsx`
- Create: `packages/web/src/components/design-system/breadcrumb.tsx`

- [ ] **Step 1: Rewrite StatusBadge with Soft Glass colors**

Replace contents of `packages/web/src/components/status-badge.tsx`:

```tsx
interface StatusBadgeProps {
  readonly value: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' },
  ready: { bg: 'var(--status-ready-bg)', text: 'var(--status-ready)' },
  running: { bg: 'var(--status-running-bg)', text: 'var(--status-running)' },
  reviewing: { bg: 'var(--status-reviewing-bg)', text: 'var(--status-reviewing)' },
  blocked: { bg: 'var(--status-blocked-bg)', text: 'var(--status-blocked)' },
  done: { bg: 'var(--status-done-bg)', text: 'var(--status-done)' },
  archived: { bg: 'var(--status-archived-bg)', text: 'var(--status-archived)' },
  warm: { bg: 'var(--status-running-bg)', text: 'var(--status-running)' },
  sleeping: { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' },
  starting: { bg: 'var(--status-ready-bg)', text: 'var(--status-ready)' },
  failed: { bg: 'var(--status-blocked-bg)', text: 'var(--status-blocked)' },
  stopped: { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' },
}

const FALLBACK = { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' }

export function StatusBadge({ value }: StatusBadgeProps) {
  const style = STATUS_STYLES[value] ?? FALLBACK
  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium"
      style={{ background: style.bg, color: style.text }}
    >
      {value.replace(/_/g, ' ')}
    </span>
  )
}
```

- [ ] **Step 2: Create StatusDot component**

Create `packages/web/src/components/design-system/status-dot.tsx`:

```tsx
const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--status-draft)',
  ready: 'var(--status-ready)',
  running: 'var(--status-running)',
  reviewing: 'var(--status-reviewing)',
  blocked: 'var(--status-blocked)',
  done: 'var(--status-done)',
  archived: 'var(--status-archived)',
  warm: 'var(--status-running)',
  sleeping: 'var(--status-draft)',
  starting: 'var(--status-ready)',
  failed: 'var(--status-blocked)',
  stopped: 'var(--status-draft)',
}

const GLOW_STATUSES = new Set(['running', 'warm', 'starting'])

interface StatusDotProps {
  readonly status: string
}

export function StatusDot({ status }: StatusDotProps) {
  const color = STATUS_COLORS[status] ?? 'var(--status-draft)'
  const hasGlow = GLOW_STATUSES.has(status)
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{
        background: color,
        boxShadow: hasGlow ? `0 0 8px ${color}` : undefined,
      }}
    />
  )
}
```

- [ ] **Step 3: Create PortBadge component**

Create `packages/web/src/components/design-system/port-badge.tsx`:

```tsx
interface PortBadgeProps {
  readonly port: number
}

export function PortBadge({ port }: PortBadgeProps) {
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded"
      style={{
        background: 'var(--primary-muted)',
        color: 'var(--primary)',
      }}
    >
      :{port}
    </span>
  )
}
```

- [ ] **Step 4: Create FilterPills component**

Create `packages/web/src/components/design-system/filter-pills.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'

interface FilterOption {
  readonly value: string
  readonly label: string
  readonly count?: number
}

interface FilterPillsProps {
  readonly options: readonly FilterOption[]
  readonly value: string
  readonly onChange: (value: string) => void
}

export function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(option => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="relative px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              color: isActive ? 'var(--primary-hover)' : 'var(--text-muted)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="active-filter-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--primary-muted)', border: '1px solid rgba(99,102,241,0.2)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1 opacity-70">{option.count}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Create Breadcrumb component**

Create `packages/web/src/components/design-system/breadcrumb.tsx`:

```tsx
import Link from 'next/link'

interface BreadcrumbSegment {
  readonly label: string
  readonly href?: string
}

interface BreadcrumbProps {
  readonly segments: readonly BreadcrumbSegment[]
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--text-muted)]">/</span>}
            {segment.href && !isLast ? (
              <Link
                href={segment.href}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}>
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 6: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/status-badge.tsx packages/web/src/components/design-system/ && git commit -m "feat(web): add StatusBadge, StatusDot, PortBadge, FilterPills, Breadcrumb"
```

---

### Task 5: Glass Sidebar + Page Transition + Layout Rewrite

**Files:**
- Create: `packages/web/src/components/glass-sidebar.tsx`
- Create: `packages/web/src/components/page-transition.tsx`
- Modify: `packages/web/src/app/layout.tsx`
- Delete: `packages/web/src/components/activity-feed.tsx`
- Delete: `packages/web/src/components/notification-center.tsx`

- [ ] **Step 1: Create GlassSidebar component**

Create `packages/web/src/components/glass-sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'

interface NavItem {
  readonly label: string
  readonly href: string
  readonly icon: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Projects', href: '/', icon: '[ ]' },
  { label: 'Dev Servers', href: '/dev-pool', icon: '{ }' },
]

interface RecentProject {
  readonly name: string
  readonly slug: string
}

interface GlassSidebarProps {
  readonly recentProjects?: readonly RecentProject[]
}

export function GlassSidebar({ recentProjects = [] }: GlassSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="w-[220px] shrink-0 h-screen sticky top-0 p-4 flex flex-col gap-6 border-r"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--primary-muted)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--primary)' }} />
        </div>
        <span className="text-[var(--text-primary)] font-bold text-base">TaskHelm</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className="relative block">
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'var(--primary-muted)', border: '1px solid rgba(99,102,241,0.15)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className="relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: active ? 'var(--primary-hover)' : 'var(--text-secondary)' }}
              >
                <span className="font-mono text-xs opacity-60">{item.icon}</span>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="flex flex-col gap-1">
          <span
            className="px-3 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Recent
          </span>
          {recentProjects.map(p => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Create PageTransition component**

Create `packages/web/src/components/page-transition.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  readonly children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 3: Rewrite layout.tsx**

Replace contents of `packages/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { GlassSidebar } from '@/components/glass-sidebar'
import { ProjectRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

export const metadata: Metadata = {
  title: 'TaskHelm',
  description: 'Autonomous AI engineering manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const projects = projectRepo.findAll()
  const recentProjects = projects.slice(0, 5).map(p => ({ name: p.name, slug: p.slug }))

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <GlassSidebar recentProjects={recentProjects} />
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Delete removed components**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && rm packages/web/src/components/activity-feed.tsx packages/web/src/components/notification-center.tsx
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/glass-sidebar.tsx packages/web/src/components/page-transition.tsx packages/web/src/app/layout.tsx && git add -u packages/web/src/components/activity-feed.tsx packages/web/src/components/notification-center.tsx && git commit -m "feat(web): add GlassSidebar + PageTransition, rewrite layout, remove notifications/activity feed"
```

---

### Task 6: Restyle ProjectCard + Rewrite Home Page

**Files:**
- Modify: `packages/web/src/components/project-card.tsx`
- Create: `packages/web/src/components/project-list.tsx`
- Modify: `packages/web/src/app/page.tsx`

- [ ] **Step 1: Rewrite ProjectCard with GlassCard + Motion**

Replace contents of `packages/web/src/components/project-card.tsx`:

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
  return (
    <Link href={`/projects/${project.slug}`}>
      <GlassCard className="p-5">
        <h3 className="font-semibold text-base text-[var(--text-primary)] mb-1">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{project.description}</p>
        )}
        <div className="text-xs font-mono text-[var(--text-muted)] mb-3 truncate">
          {project.local_repo_root}
        </div>
        <div className="flex items-center gap-4 text-sm">
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

- [ ] **Step 2: Create ProjectList with staggered animation**

Create `packages/web/src/components/project-list.tsx`:

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
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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

- [ ] **Step 3: Rewrite home page**

Replace contents of `packages/web/src/app/page.tsx`:

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Projects</h2>
          <span className="text-sm text-[var(--text-muted)]">{projects.length} project(s)</span>
        </div>
        <CreateProjectForm />
      </div>
      <ProjectList projects={projectsWithCounts} />
    </PageTransition>
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/project-card.tsx packages/web/src/components/project-list.tsx packages/web/src/app/page.tsx && git commit -m "feat(web): restyle ProjectCard + home page with Soft Glass + stagger animation"
```

---

### Task 7: Rewrite TaskRow + TaskList + Project Detail Page

**Files:**
- Modify: `packages/web/src/components/task-row.tsx`
- Create: `packages/web/src/components/task-list.tsx`
- Modify: `packages/web/src/app/projects/[slug]/page.tsx`
- Delete: `packages/web/src/components/task-board.tsx`
- Delete: `packages/web/src/components/project-actions.tsx`
- Delete: `packages/web/src/components/task-status-select.tsx`

- [ ] **Step 1: Rewrite TaskRow as a horizontal glass row**

Replace contents of `packages/web/src/components/task-row.tsx`:

```tsx
'use client'

import type { Task } from '@taskhelm/core'
import Link from 'next/link'
import { motion } from 'motion/react'
import { StatusDot } from '@/components/design-system/status-dot'
import { StatusBadge } from '@/components/status-badge'
import { PortBadge } from '@/components/design-system/port-badge'

interface TaskRowProps {
  readonly task: Task
  readonly projectSlug: string
}

export function TaskRow({ task, projectSlug }: TaskRowProps) {
  const isDone = task.status === 'done' || task.status === 'archived'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/projects/${projectSlug}/tasks/${task.id}`}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--glass-radius-sm)] border transition-colors hover:bg-[var(--surface-hover)]"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <StatusDot status={task.status} />
          <span
            className={`text-sm flex-1 ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
          >
            {task.title}
          </span>
          <StatusBadge value={task.status} />
          {task.port != null && <PortBadge port={task.port} />}
        </div>
      </Link>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create TaskList with filter pills**

Create `packages/web/src/components/task-list.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { Task } from '@taskhelm/core'
import { FilterPills } from '@/components/design-system/filter-pills'
import { TaskRow } from '@/components/task-row'

interface TaskListProps {
  readonly tasks: readonly Task[]
  readonly projectSlug: string
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'running', label: 'Running' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

export function TaskList({ tasks, projectSlug }: TaskListProps) {
  const [filter, setFilter] = useState('all')

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter)

  const filterOptions = STATUS_FILTERS.map(f => ({
    ...f,
    count: f.value === 'all' ? tasks.length : tasks.filter(t => t.status === f.value).length,
  }))

  return (
    <div>
      <div className="mb-4">
        <FilterPills options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-muted)]">
            {filter === 'all' ? 'No tasks yet. Create your first task!' : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => (
              <TaskRow key={task.id} task={task} projectSlug={projectSlug} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rewrite project detail page**

Replace contents of `packages/web/src/app/projects/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { TaskList } from '@/components/task-list'
import { CreateTaskForm } from '@/components/create-task-form'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { PageTransition } from '@/components/page-transition'
import { EditProjectForm } from '@/components/edit-project-form'
import { DeleteConfirm } from '@/components/delete-confirm'

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)

  const project = projectRepo.findBySlug(slug)
  if (!project) notFound()

  const tasks = taskRepo.findByProjectId(project.id)

  return (
    <PageTransition>
      <Breadcrumb segments={[
        { label: 'Projects', href: '/' },
        { label: project.name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{project.description}</p>
          )}
          <div className="font-mono text-xs text-[var(--text-muted)] mt-1">{project.local_repo_root}</div>
        </div>
        <div className="flex items-center gap-2">
          <EditProjectForm project={project} />
          <DeleteConfirm
            label="Delete"
            confirmText={`Delete project "${project.name}"? This cannot be undone.`}
            onConfirm={async () => {
              'use server'
              const db2 = getDb()
              new ProjectRepository(db2).delete(project.id)
            }}
          />
          <CreateTaskForm projectId={project.id} />
        </div>
      </div>

      {/* Task List */}
      <TaskList tasks={tasks} projectSlug={slug} />
    </PageTransition>
  )
}
```

- [ ] **Step 4: Delete removed components**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && rm packages/web/src/components/task-board.tsx packages/web/src/components/project-actions.tsx packages/web/src/components/task-status-select.tsx
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors (fix any issues from removed imports)

- [ ] **Step 6: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/task-row.tsx packages/web/src/components/task-list.tsx packages/web/src/app/projects/[slug]/page.tsx && git add -u packages/web/src/components/task-board.tsx packages/web/src/components/project-actions.tsx packages/web/src/components/task-status-select.tsx && git commit -m "feat(web): rewrite TaskRow, TaskList, project detail page with glass + filter pills"
```

---

### Task 8: Context Files API Route

**Files:**
- Create: `packages/web/src/app/api/tasks/[taskId]/context-files/route.ts`

- [ ] **Step 1: Create context-files API route**

Create `packages/web/src/app/api/tasks/[taskId]/context-files/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import * as fs from 'node:fs'
import * as path from 'node:path'

type Params = { params: Promise<{ taskId: string }> }

const CONTEXT_FILES = ['context.md', 'plan.md', 'handoff.md', 'review.md'] as const

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const projectRepo = new ProjectRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const project = projectRepo.findById(task.project_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const capsuleDir = path.join(
      project.local_repo_root,
      'projects',
      project.slug,
      'tasks',
      task.id
    )

    const files = CONTEXT_FILES.map(filename => {
      const filePath = path.join(capsuleDir, filename)
      const exists = fs.existsSync(filePath)
      return {
        name: filename,
        path: filePath,
        exists,
        content: exists ? fs.readFileSync(filePath, 'utf-8') : null,
      }
    }).filter(f => f.exists)

    return NextResponse.json({
      capsuleDir,
      files,
      specdownUsername: project.specdown_project_ref?.split('/')[0] ?? null,
      specdownSlug: project.specdown_project_ref?.split('/')[1] ?? null,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/app/api/tasks/[taskId]/context-files/route.ts && git commit -m "feat(web): add context-files API route to read task capsule markdown"
```

---

### Task 9: Context File List + Preview Components

**Files:**
- Create: `packages/web/src/components/context-file-list.tsx`
- Create: `packages/web/src/components/context-file-preview.tsx`

- [ ] **Step 1: Create ContextFileList component**

Create `packages/web/src/components/context-file-list.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'

interface ContextFile {
  readonly name: string
  readonly content: string | null
}

interface ContextFileListProps {
  readonly files: readonly ContextFile[]
  readonly selectedFile: string | null
  readonly onSelect: (name: string) => void
  readonly specdownUrl: string | null
}

export function ContextFileList({ files, selectedFile, onSelect, specdownUrl }: ContextFileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--text-muted)]">No context files yet.</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Initialize workspace to create task capsule.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {files.map(file => {
        const isSelected = file.name === selectedFile
        return (
          <motion.button
            key={file.name}
            onClick={() => onSelect(file.name)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--glass-radius-sm)] border text-left transition-colors"
            style={{
              background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
              borderColor: isSelected ? 'var(--border-hover)' : 'var(--border)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-[var(--primary)] text-sm">&#128196;</span>
            <span className="text-sm text-[var(--text-primary)] flex-1">{file.name}</span>
            {specdownUrl && (
              <a
                href={specdownUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] underline transition-colors"
                onClick={e => e.stopPropagation()}
              >
                Open in SpecDown
              </a>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create ContextFilePreview component**

Create `packages/web/src/components/context-file-preview.tsx`:

```tsx
interface ContextFilePreviewProps {
  readonly filename: string | null
  readonly content: string | null
}

export function ContextFilePreview({ filename, content }: ContextFilePreviewProps) {
  if (!filename || !content) {
    return (
      <div
        className="flex-1 rounded-[var(--glass-radius-sm)] border p-4 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm text-[var(--text-muted)]">Select a file to preview</p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 rounded-[var(--glass-radius-sm)] border p-4 overflow-auto"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}
    >
      <div className="text-xs font-mono text-[var(--text-muted)] mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {filename}
      </div>
      <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/context-file-list.tsx packages/web/src/components/context-file-preview.tsx && git commit -m "feat(web): add ContextFileList + ContextFilePreview components"
```

---

### Task 10: Workspace Panel + Dev Server Panel

**Files:**
- Create: `packages/web/src/components/workspace-panel.tsx`
- Create: `packages/web/src/components/dev-server-panel.tsx`
- Delete: `packages/web/src/components/workspace-controls.tsx`
- Delete: `packages/web/src/components/dev-server-controls.tsx`

- [ ] **Step 1: Create WorkspacePanel with glass styling**

Create `packages/web/src/components/workspace-panel.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'

interface WorkspacePanelProps {
  readonly task: Task
}

export function WorkspacePanel({ task }: WorkspacePanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const hasWorkspace = task.branch_name !== null && task.worktree_path !== null

  const handleInit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to init workspace')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  const handleCleanup = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to cleanup workspace')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  return (
    <div
      className="rounded-[var(--glass-radius)] border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h4
        className="text-[10px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Workspace
      </h4>

      {hasWorkspace ? (
        <div className="space-y-2">
          <div>
            <span className="text-xs text-[var(--text-muted)]">Branch</span>
            <div className="font-mono text-sm text-[var(--text-primary)]">{task.branch_name}</div>
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Worktree</span>
            <div className="font-mono text-xs text-[var(--text-secondary)] break-all">{task.worktree_path}</div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] mb-3">No workspace initialized.</p>
      )}

      {error && (
        <div className="mt-3 p-2 rounded-[var(--glass-radius-sm)] text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
          {error}
        </div>
      )}

      <div className="mt-3">
        {!hasWorkspace ? (
          <GlassButton variant="primary" onClick={handleInit} loading={loading} className="text-xs px-3 py-1.5">
            Init Workspace
          </GlassButton>
        ) : (
          <GlassButton variant="danger" onClick={handleCleanup} loading={loading} className="text-xs px-3 py-1.5">
            Cleanup
          </GlassButton>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create DevServerPanel with port input**

Create `packages/web/src/components/dev-server-panel.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { StatusDot } from '@/components/design-system/status-dot'

interface DevServerPanelProps {
  readonly task: Task
}

export function DevServerPanel({ task }: DevServerPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const state = task.dev_server_state
  const port = task.port
  const isRunning = state === 'running' || state === 'warm'

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to start dev server')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  const handleStop = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to stop dev server')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  return (
    <div
      className="rounded-[var(--glass-radius)] border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h4
        className="text-[10px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Dev Server
      </h4>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        {state ? (
          <>
            <StatusDot status={state} />
            <span className="text-sm text-[var(--text-primary)]">{state}</span>
          </>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">not started</span>
        )}
        {port != null && (
          <span
            className="ml-auto font-mono text-sm px-2 py-0.5 rounded"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
          >
            :{port}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 rounded-[var(--glass-radius-sm)] text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <GlassButton
            variant="primary"
            onClick={handleStart}
            loading={loading}
            disabled={!task.worktree_path}
            className="text-xs px-3 py-1.5"
          >
            Start
          </GlassButton>
        ) : (
          <>
            <GlassButton variant="danger" onClick={handleStop} loading={loading} className="text-xs px-3 py-1.5">
              Stop
            </GlassButton>
            {port != null && (
              <a
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-[var(--glass-radius-sm)] text-xs font-medium transition-colors"
                style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
              >
                Open
              </a>
            )}
          </>
        )}
      </div>

      {!task.worktree_path && !state && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Initialize workspace first to enable dev server.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Delete old components**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && rm packages/web/src/components/workspace-controls.tsx packages/web/src/components/dev-server-controls.tsx
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/workspace-panel.tsx packages/web/src/components/dev-server-panel.tsx && git add -u packages/web/src/components/workspace-controls.tsx packages/web/src/components/dev-server-controls.tsx && git commit -m "feat(web): add WorkspacePanel + DevServerPanel, remove old controls"
```

---

### Task 11: Task Detail Split Panels + Page Rewrite

**Files:**
- Create: `packages/web/src/components/task-detail-panels.tsx`
- Modify: `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`
- Delete: `packages/web/src/components/task-cockpit.tsx`
- Delete: `packages/web/src/components/task-actions.tsx`
- Delete: `packages/web/src/components/agent-run-list.tsx`
- Delete: `packages/web/src/components/review-pipeline.tsx`
- Delete: `packages/web/src/components/dispatch-agent-form.tsx`

- [ ] **Step 1: Create TaskDetailPanels (split layout)**

Create `packages/web/src/components/task-detail-panels.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import type { Task, Project } from '@taskhelm/core'
import { ContextFileList } from '@/components/context-file-list'
import { ContextFilePreview } from '@/components/context-file-preview'
import { WorkspacePanel } from '@/components/workspace-panel'
import { DevServerPanel } from '@/components/dev-server-panel'

interface ContextFile {
  readonly name: string
  readonly content: string | null
}

interface TaskDetailPanelsProps {
  readonly task: Task
  readonly project: Project
}

export function TaskDetailPanels({ task, project }: TaskDetailPanelsProps) {
  const [files, setFiles] = useState<readonly ContextFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch(`/api/tasks/${task.id}/context-files`)
        if (res.ok) {
          const data = await res.json()
          setFiles(data.files)
          if (data.files.length > 0) {
            setSelectedFile(data.files[0].name)
          }
        }
      } catch {
        // Context files not available — expected for tasks without workspace
      } finally {
        setLoading(false)
      }
    }
    loadFiles()
  }, [task.id])

  const selectedContent = files.find(f => f.name === selectedFile)?.content ?? null

  const specdownRef = project.specdown_project_ref
  const specdownUrl = specdownRef ? `/${specdownRef}` : null

  return (
    <div className="flex gap-6" style={{ minHeight: '400px' }}>
      {/* Left Panel: Context Files */}
      <div className="flex-1 flex flex-col gap-3">
        <h4
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Context Files
        </h4>

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : (
          <>
            <ContextFileList
              files={files}
              selectedFile={selectedFile}
              onSelect={setSelectedFile}
              specdownUrl={specdownUrl}
            />
            <ContextFilePreview filename={selectedFile} content={selectedContent} />
          </>
        )}
      </div>

      {/* Right Panel: Workspace + Dev Server */}
      <div className="w-[280px] shrink-0 flex flex-col gap-4">
        <WorkspacePanel task={task} />
        <DevServerPanel task={task} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite task detail page**

Replace contents of `packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { StatusBadge } from '@/components/status-badge'
import { PortBadge } from '@/components/design-system/port-badge'
import { TaskDetailPanels } from '@/components/task-detail-panels'
import { EditTaskForm } from '@/components/edit-task-form'
import { DeleteConfirm } from '@/components/delete-confirm'
import { PageTransition } from '@/components/page-transition'

interface TaskPageProps {
  params: Promise<{ slug: string; taskId: string }>
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { slug, taskId } = await params
  const db = getDb()

  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)

  const project = projectRepo.findBySlug(slug)
  if (!project) notFound()

  const task = taskRepo.findById(taskId)
  if (!task || task.project_id !== project.id) notFound()

  return (
    <PageTransition>
      <Breadcrumb segments={[
        { label: 'Projects', href: '/' },
        { label: project.name, href: `/projects/${slug}` },
        { label: task.title },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{task.title}</h2>
          <StatusBadge value={task.status} />
          {task.port != null && <PortBadge port={task.port} />}
        </div>
        <div className="flex items-center gap-2">
          <EditTaskForm task={task} projectSlug={slug} />
          <DeleteConfirm
            label="Delete"
            confirmText={`Delete task "${task.title}"? This cannot be undone.`}
            onConfirm={async () => {
              'use server'
              const db2 = getDb()
              new TaskRepository(db2).delete(task.id)
            }}
          />
        </div>
      </div>

      {/* Split Panels */}
      <TaskDetailPanels task={task} project={project} />
    </PageTransition>
  )
}
```

- [ ] **Step 3: Delete removed components**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && rm packages/web/src/components/task-cockpit.tsx packages/web/src/components/task-actions.tsx packages/web/src/components/agent-run-list.tsx packages/web/src/components/review-pipeline.tsx packages/web/src/components/dispatch-agent-form.tsx
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors (fix any issues from removed imports)

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/task-detail-panels.tsx packages/web/src/app/projects/[slug]/tasks/[taskId]/page.tsx && git add -u packages/web/src/components/task-cockpit.tsx packages/web/src/components/task-actions.tsx packages/web/src/components/agent-run-list.tsx packages/web/src/components/review-pipeline.tsx packages/web/src/components/dispatch-agent-form.tsx && git commit -m "feat(web): add split-panel TaskDetail, remove agent/review/cockpit components"
```

---

### Task 12: Restyle Dev Pool Page

**Files:**
- Modify: `packages/web/src/app/dev-pool/page.tsx`

- [ ] **Step 1: Rewrite dev pool page with glass styling**

Replace contents of `packages/web/src/app/dev-pool/page.tsx`:

```tsx
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getPoolStatus } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { StatusBadge } from '@/components/status-badge'
import { PortBadge } from '@/components/design-system/port-badge'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { PageTransition } from '@/components/page-transition'

export default function DevPoolPage() {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)
  const projects = projectRepo.findAll()

  const pool = projects.flatMap(project => {
    const { servers } = getPoolStatus(db, project.id)
    return servers.map(server => {
      const task = server.task_id ? taskRepo.findById(server.task_id) : null
      return {
        projectSlug: project.slug,
        projectName: project.name,
        taskId: server.task_id,
        taskTitle: task?.title ?? null,
        port: server.port,
        pid: server.pid,
        status: server.status,
        startedAt: server.started_at,
      }
    })
  })

  return (
    <PageTransition>
      <Breadcrumb segments={[{ label: 'Dev Servers' }]} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Dev Server Pool</h2>
        <span className="text-sm text-[var(--text-muted)]">{pool.length} server(s)</span>
      </div>

      {pool.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2 text-[var(--text-secondary)]">No dev servers running</p>
          <p className="text-sm text-[var(--text-muted)]">Start a dev server from a task&apos;s detail page.</p>
        </div>
      ) : (
        <div
          className="rounded-[var(--glass-radius)] border overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-20" style={{ color: 'var(--text-muted)' }}>Port</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-20" style={{ color: 'var(--text-muted)' }}>PID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-24" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Started</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((s, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-4 py-3">
                    <a href={`/projects/${s.projectSlug}`} className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                      {s.projectName}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {s.taskId ? (
                      <a
                        href={`/projects/${s.projectSlug}/tasks/${s.taskId}`}
                        className="text-[var(--text-primary)] hover:text-white transition-colors"
                      >
                        {s.taskTitle ?? s.taskId}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><PortBadge port={s.port} /></td>
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{s.pid ?? '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                  <td className="px-4 py-3 text-xs font-mono text-[var(--text-muted)]">
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageTransition>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/app/dev-pool/page.tsx && git commit -m "feat(web): restyle dev pool page with glass design"
```

---

### Task 13: Restyle Forms — CreateProjectForm + CreateTaskForm

**Files:**
- Modify: `packages/web/src/components/create-project-form.tsx`
- Modify: `packages/web/src/components/create-task-form.tsx`

- [ ] **Step 1: Restyle CreateProjectForm with GlassModal + GlassInput + GlassButton**

Replace contents of `packages/web/src/components/create-project-form.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassButton } from '@/components/design-system/glass-button'
import { FolderPicker } from '@/components/folder-picker'

interface FormState {
  readonly name: string
  readonly slug: string
  readonly localRepoRoot: string
  readonly description: string
  readonly defaultBranch: string
  readonly devCommand: string
  readonly installCommand: string
  readonly testCommand: string
}

const INITIAL_STATE: FormState = {
  name: '',
  slug: '',
  localRepoRoot: '',
  description: '',
  defaultBranch: '',
  devCommand: '',
  installCommand: '',
  testCommand: '',
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function CreateProjectForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const autoSlug = useCallback((name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === toSlug(prev.name) ? toSlug(name) : prev.slug,
    }))
  }, [])

  const handleFolderSelect = useCallback((folderPath: string) => {
    const folderName = folderPath.split('/').pop() ?? ''
    setForm(prev => ({
      ...prev,
      localRepoRoot: folderPath,
      name: prev.name === '' ? folderName : prev.name,
      slug: prev.slug === '' ? toSlug(folderName) : prev.slug,
    }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, string | undefined> = {
        name: form.name,
        slug: form.slug,
        local_repo_root: form.localRepoRoot,
      }
      if (form.description) body.description = form.description
      if (form.defaultBranch) body.default_branch = form.defaultBranch
      if (form.devCommand) body.dev_command = form.devCommand
      if (form.installCommand) body.install_command = form.installCommand
      if (form.testCommand) body.test_command = form.testCommand

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create project')
      }
      setForm(INITIAL_STATE)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [form, router])

  const handleClose = useCallback(() => {
    setOpen(false)
    setForm(INITIAL_STATE)
    setError(null)
  }, [])

  return (
    <>
      <GlassButton onClick={() => setOpen(true)}>+ New Project</GlassButton>

      <GlassModal open={open} onClose={handleClose} title="Create Project">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 rounded-[var(--glass-radius-sm)] text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <span className="block text-xs text-[var(--text-muted)] mb-1.5">Repository Folder *</span>
              <FolderPicker value={form.localRepoRoot} onChange={handleFolderSelect} />
            </div>
            <GlassInput label="Name *" value={form.name} onChange={e => autoSlug(e.target.value)} placeholder="My Project" />
            <GlassInput label="Slug *" value={form.slug} onChange={e => updateField('slug', e.target.value)} placeholder="my-project" />
            <GlassInput label="Description" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Optional description" />
            <GlassInput label="Default Branch" value={form.defaultBranch} onChange={e => updateField('defaultBranch', e.target.value)} placeholder="main" />
            <GlassInput label="Dev Command" value={form.devCommand} onChange={e => updateField('devCommand', e.target.value)} placeholder="npm run dev" />
            <GlassInput label="Install Command" value={form.installCommand} onChange={e => updateField('installCommand', e.target.value)} placeholder="npm install" />
            <GlassInput label="Test Command" value={form.testCommand} onChange={e => updateField('testCommand', e.target.value)} placeholder="npm test" />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={handleClose}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting} disabled={!form.name || !form.slug || !form.localRepoRoot}>
              Create Project
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
```

- [ ] **Step 2: Restyle CreateTaskForm with GlassModal + GlassInput + GlassSelect + GlassButton**

Replace contents of `packages/web/src/components/create-task-form.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'
import { GlassButton } from '@/components/design-system/glass-button'

interface CreateTaskFormProps {
  readonly projectId: string
}

interface FormState {
  readonly title: string
  readonly goal: string
  readonly sourceType: string
  readonly sourceRef: string
  readonly priority: string
}

const INITIAL_STATE: FormState = {
  title: '',
  goal: '',
  sourceType: '',
  sourceRef: '',
  priority: '3',
}

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Critical' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Low' },
  { value: '5', label: 'Backlog' },
]

export function CreateTaskForm({ projectId }: CreateTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, string | number> = {
        project_id: projectId,
        title: form.title,
        priority: parseInt(form.priority, 10),
      }
      if (form.goal) body.goal = form.goal
      if (form.sourceType) body.source_type = form.sourceType
      if (form.sourceRef) body.source_ref = form.sourceRef

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create task')
      }
      setForm(INITIAL_STATE)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [form, projectId, router])

  const handleClose = useCallback(() => {
    setOpen(false)
    setForm(INITIAL_STATE)
    setError(null)
  }, [])

  return (
    <>
      <GlassButton onClick={() => setOpen(true)}>+ New Task</GlassButton>

      <GlassModal open={open} onClose={handleClose} title="Create Task">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 rounded-[var(--glass-radius-sm)] text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <GlassInput label="Title *" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Add user authentication" />
            <GlassInput label="Goal" value={form.goal} onChange={e => updateField('goal', e.target.value)} placeholder="Implement JWT-based auth" />
            <GlassSelect label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={e => updateField('priority', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Source Type" value={form.sourceType} onChange={e => updateField('sourceType', e.target.value)} placeholder="github_issue" />
              <GlassInput label="Source Ref" value={form.sourceRef} onChange={e => updateField('sourceRef', e.target.value)} placeholder="#42" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={handleClose}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting} disabled={!form.title}>
              Create Task
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/create-project-form.tsx packages/web/src/components/create-task-form.tsx && git commit -m "feat(web): restyle CreateProject + CreateTask forms with glass design system"
```

---

### Task 14: Restyle EditProjectForm + EditTaskForm + DeleteConfirm + FolderPicker

**Files:**
- Modify: `packages/web/src/components/edit-project-form.tsx`
- Modify: `packages/web/src/components/edit-task-form.tsx`
- Modify: `packages/web/src/components/delete-confirm.tsx`
- Modify: `packages/web/src/components/folder-picker.tsx`

- [ ] **Step 1: Restyle EditProjectForm**

Replace contents of `packages/web/src/components/edit-project-form.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@taskhelm/core'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassButton } from '@/components/design-system/glass-button'

interface EditProjectFormProps {
  readonly project: Project
}

interface FormState {
  readonly name: string
  readonly description: string
  readonly devCommand: string
  readonly installCommand: string
  readonly testCommand: string
  readonly maxDevServers: string
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: project.name,
    description: project.description ?? '',
    devCommand: project.dev_command ?? '',
    installCommand: project.install_command ?? '',
    testCommand: project.test_command ?? '',
    maxDevServers: String(project.max_active_dev_servers),
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, string | number> = { name: form.name }
      body.description = form.description || ''
      if (form.devCommand) body.dev_command = form.devCommand
      if (form.installCommand) body.install_command = form.installCommand
      if (form.testCommand) body.test_command = form.testCommand
      body.max_active_dev_servers = parseInt(form.maxDevServers, 10) || 3

      const res = await fetch(`/api/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update project')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [form, project.slug, router])

  return (
    <>
      <GlassButton variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
        Edit
      </GlassButton>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Edit Project">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 rounded-[var(--glass-radius-sm)] text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
              {error}
            </div>
          )}
          <div className="space-y-3">
            <GlassInput label="Name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Project name" />
            <GlassInput label="Description" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Description" />
            <GlassInput label="Dev Command" value={form.devCommand} onChange={e => updateField('devCommand', e.target.value)} placeholder="npm run dev" />
            <GlassInput label="Install Command" value={form.installCommand} onChange={e => updateField('installCommand', e.target.value)} placeholder="npm install" />
            <GlassInput label="Test Command" value={form.testCommand} onChange={e => updateField('testCommand', e.target.value)} placeholder="npm test" />
            <GlassInput label="Max Dev Servers" type="number" value={form.maxDevServers} onChange={e => updateField('maxDevServers', e.target.value)} placeholder="3" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting}>Save</GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
```

- [ ] **Step 2: Restyle EditTaskForm**

Replace contents of `packages/web/src/components/edit-task-form.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'
import { GlassButton } from '@/components/design-system/glass-button'

interface EditTaskFormProps {
  readonly task: Task
  readonly projectSlug: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'running', label: 'Running' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Critical' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Low' },
  { value: '5', label: 'Backlog' },
]

interface FormState {
  readonly title: string
  readonly goal: string
  readonly status: string
  readonly priority: string
}

export function EditTaskForm({ task, projectSlug }: EditTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: task.title,
    goal: task.goal ?? '',
    status: task.status,
    priority: String(task.priority),
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          goal: form.goal || null,
          status: form.status,
          priority: parseInt(form.priority, 10),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update task')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [form, task.id, router])

  return (
    <>
      <GlassButton variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
        Edit
      </GlassButton>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Edit Task">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 rounded-[var(--glass-radius-sm)] text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
              {error}
            </div>
          )}
          <div className="space-y-3">
            <GlassInput label="Title" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Task title" />
            <GlassInput label="Goal" value={form.goal} onChange={e => updateField('goal', e.target.value)} placeholder="Task goal" />
            <GlassSelect label="Status" options={STATUS_OPTIONS} value={form.status} onChange={e => updateField('status', e.target.value)} />
            <GlassSelect label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={e => updateField('priority', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting}>Save</GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
```

- [ ] **Step 3: Restyle DeleteConfirm**

Replace contents of `packages/web/src/components/delete-confirm.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassButton } from '@/components/design-system/glass-button'

interface DeleteConfirmProps {
  readonly label: string
  readonly confirmText: string
  readonly onConfirm: () => Promise<void>
}

export function DeleteConfirm({ label, confirmText, onConfirm }: DeleteConfirmProps) {
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
      <GlassButton variant="danger" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
        {label}
      </GlassButton>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Confirm Delete" maxWidth="max-w-sm">
        <p className="text-sm text-[var(--text-secondary)] mb-6">{confirmText}</p>
        <div className="flex justify-end gap-3">
          <GlassButton variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
          <GlassButton variant="danger" onClick={handleConfirm} loading={deleting}>Delete</GlassButton>
        </div>
      </GlassModal>
    </>
  )
}
```

- [ ] **Step 4: Restyle FolderPicker with glass components**

Replace contents of `packages/web/src/components/folder-picker.tsx`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassModal } from '@/components/design-system/glass-modal'

interface DirEntry {
  readonly name: string
  readonly path: string
  readonly isGitRepo: boolean
}

interface BrowseResult {
  readonly current: string
  readonly parent: string
  readonly isGitRepo: boolean
  readonly gitRoot: string | null
  readonly dirs: readonly DirEntry[]
}

interface FolderPickerProps {
  readonly value: string
  readonly onChange: (path: string) => void
}

export function FolderPicker({ value, onChange }: FolderPickerProps) {
  const [open, setOpen] = useState(false)
  const [browsePath, setBrowsePath] = useState<string>('')
  const [data, setData] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const browse = useCallback(async (dirPath?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''
      const res = await fetch(`/api/fs/browse${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to browse')
      }
      const result: BrowseResult = await res.json()
      setData(result)
      setBrowsePath(result.current)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) browse(value || undefined)
  }, [open, value, browse])

  const handleSelect = useCallback(() => {
    onChange(browsePath)
    setOpen(false)
  }, [browsePath, onChange])

  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          placeholder="Click Browse to select a folder"
          className="flex-1 px-3 py-2 rounded-[var(--glass-radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <GlassButton type="button" variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-2">
          Browse
        </GlassButton>
      </div>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Select Repository Folder">
        {/* Path input */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={browsePath}
            onChange={e => setBrowsePath(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') browse(browsePath) }}
            className="flex-1 px-3 py-1.5 rounded-[var(--glass-radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          />
          <GlassButton type="button" variant="secondary" onClick={() => browse(browsePath)} className="text-xs px-3 py-1.5">
            Go
          </GlassButton>
        </div>

        {/* Git indicator */}
        {data?.isGitRepo && (
          <div className="mb-3 px-3 py-2 rounded-[var(--glass-radius-sm)] text-xs flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--status-done)' }}>
            Git repository detected
          </div>
        )}

        {error && (
          <div className="mb-3 p-2 rounded-[var(--glass-radius-sm)] text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
            {error}
          </div>
        )}

        {/* Directory listing */}
        <div className="rounded-[var(--glass-radius-sm)] border overflow-hidden mb-4 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          {data && data.current !== data.parent && (
            <button
              type="button"
              onClick={() => browse(data.parent)}
              className="w-full px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span>..</span>
              <span className="text-xs text-[var(--text-muted)]">(parent)</span>
            </button>
          )}

          {loading && <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">Loading...</div>}

          {!loading && data?.dirs.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">No subdirectories</div>
          )}

          {!loading && data?.dirs.map(dir => (
            <button
              key={dir.path}
              type="button"
              onClick={() => browse(dir.path)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[var(--text-primary)]">{dir.name}</span>
              {dir.isGitRepo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-done)' }}>git</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <GlassButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
          <GlassButton type="button" onClick={handleSelect}>Select This Folder</GlassButton>
        </div>
      </GlassModal>
    </>
  )
}
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add packages/web/src/components/edit-project-form.tsx packages/web/src/components/edit-task-form.tsx packages/web/src/components/delete-confirm.tsx packages/web/src/components/folder-picker.tsx && git commit -m "feat(web): restyle EditProject, EditTask, DeleteConfirm, FolderPicker with glass design"
```

---

### Task 15: Remove Unused API Routes + Cleanup + Final Typecheck

**Files:**
- Delete: `packages/web/src/app/api/tasks/[taskId]/agent/route.ts`
- Delete: `packages/web/src/app/api/notifications/route.ts`
- Delete: `packages/web/src/app/api/events/route.ts`
- Delete: `packages/web/src/lib/use-events.ts`
- Modify: `packages/web/src/app/api/tasks/[taskId]/route.ts` (remove agent/review imports)

- [ ] **Step 1: Delete unused API routes and hooks**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && rm packages/web/src/app/api/tasks/[taskId]/agent/route.ts packages/web/src/app/api/notifications/route.ts packages/web/src/app/api/events/route.ts packages/web/src/lib/use-events.ts
```

- [ ] **Step 2: Clean up task API route (remove agent/review references)**

Replace contents of `packages/web/src/app/api/tasks/[taskId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()

    if (body.status !== undefined) {
      taskRepo.updateStatus(taskId, body.status)
    }

    const updated = taskRepo.update(taskId, body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    taskRepo.delete(taskId)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Run full typecheck**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Run the dev server to verify everything renders**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web dev
```
Expected: Server starts on port 4100, navigate to `http://localhost:4100` and verify:
- Gradient background renders
- Glass sidebar with nav items visible
- Home page shows project cards (or empty state)

- [ ] **Step 5: Commit**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add -u packages/web/src/app/api/tasks/[taskId]/agent/route.ts packages/web/src/app/api/notifications/route.ts packages/web/src/app/api/events/route.ts packages/web/src/lib/use-events.ts && git add packages/web/src/app/api/tasks/[taskId]/route.ts && git commit -m "chore(web): remove agent/notification/events routes, clean up task API"
```

---

### Task 16: Visual QA + Polish

**Files:**
- Various minor fixes as needed

- [ ] **Step 1: Start dev server and navigate through all pages**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web dev
```

Check each page in browser at `http://localhost:4100`:
1. Home page — project grid with glass cards, stagger animation, gradient background
2. Project detail — breadcrumb, filter pills, task list rows
3. Task detail — split panels with context files left, workspace/dev server right
4. Dev pool — glass-styled table
5. Create project modal — folder picker, glass inputs, animation
6. Create task modal — glass inputs + select, animation
7. Edit/delete modals — glass styling, spring animations

- [ ] **Step 2: Fix any visual issues found**

Address any spacing, color, border, or animation issues discovered during QA.

- [ ] **Step 3: Run full typecheck one final time**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && pnpm --filter @taskhelm/web exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit any polish fixes**

```bash
cd /Users/vantienkhai/Documents/TaskHelm && git add -A packages/web/src && git commit -m "fix(web): visual polish and QA fixes for glass redesign"
```
