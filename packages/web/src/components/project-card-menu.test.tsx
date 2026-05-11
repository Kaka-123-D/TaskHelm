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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      ...props
    }: React.ComponentPropsWithoutRef<'div'> & {
      animate?: unknown
      initial?: unknown
      transition?: unknown
      variants?: unknown
      whileHover?: unknown
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileTap: _whileTap,
      ...props
    }: React.ComponentPropsWithoutRef<'button'> & {
      whileTap?: unknown
    }) => <button {...props}>{children}</button>,
  },
}))

vi.mock('@/components/delete-confirm', () => ({
  DeleteConfirm: ({
    label,
    confirmText,
    renderTrigger,
  }: {
    readonly label: string
    readonly confirmText: string
    readonly onConfirm: () => Promise<void>
    readonly renderTrigger?: (props: { open: () => void; deleting: boolean }) => React.ReactNode
  }) => (
    <div data-slot="delete-confirm-stub" data-label={label} data-confirm-text={confirmText}>
      {renderTrigger ? renderTrigger({ open: vi.fn(), deleting: false }) : label}
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
  max_active_dev_servers: 1,
    is_multi_repo: false,
  created_at: '2026-04-12T00:00:00.000Z',
  updated_at: '2026-04-12T00:00:00.000Z',
} satisfies Project

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectCard overflow menu', () => {
  it('renders a card-local overflow trigger with an accessible label', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(<ProjectCard project={baseProject} taskCount={2} runningCount={0} />)

    expect(markup).toContain('data-slot="project-card-overflow-trigger"')
    expect(markup).toContain('aria-label="Project actions for Project One"')
  })

  it('renders a delete confirmation flow for the current project', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(<ProjectCard project={baseProject} taskCount={2} runningCount={0} />)

    expect(markup).toContain('data-slot="project-card-overflow-menu"')
    expect(markup).toContain('data-slot="delete-confirm-stub"')
    expect(markup).toContain('Delete project')
    expect(markup).toContain('Delete project &quot;Project One&quot;? This cannot be undone.')
  })

  it('keeps the overflow controls outside the card link', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(<ProjectCard project={baseProject} taskCount={2} runningCount={0} />)

    expect(markup).toMatch(/<\/a><div class="[^"]*\bproject-card-overflow\b[^"]*"/)
  })

  it('anchors the overflow container absolutely instead of mixing flow-relative positioning', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(<ProjectCard project={baseProject} taskCount={2} runningCount={0} />)

    expect(markup).toMatch(/class="[^"]*\bproject-card-overflow\b[^"]*\babsolute\b[^"]*"/)
    expect(markup).not.toMatch(/class="[^"]*\bproject-card-overflow\b[^"]*\brelative\b[^"]*\babsolute\b[^"]*"/)
  })
})
