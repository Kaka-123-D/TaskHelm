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
  },
}))

vi.mock('@/components/delete-confirm', () => ({
  DeleteConfirm: ({
    renderTrigger,
  }: {
    readonly label: string
    readonly confirmText: string
    readonly onConfirm: () => Promise<void>
    readonly renderTrigger?: (props: { open: () => void; deleting: boolean }) => React.ReactNode
  }) => (
    <div data-slot="delete-confirm-stub">
      {renderTrigger ? renderTrigger({ open: vi.fn(), deleting: false }) : null}
    </div>
  ),
}))

const baseProject = {
  id: 'project-1',
  slug: 'project-one',
  name: 'Project One',
  description: null,
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

const makeProject = (description: Project['description'] = null): Project => ({
  ...baseProject,
  description,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('project card layout', () => {
  it('keeps a reserved description slot when the project has no description', async () => {
    const { ProjectCard } = await import('./project-card')

    const markup = renderToStaticMarkup(<ProjectCard project={makeProject()} taskCount={3} runningCount={1} />)

    expect(markup).toMatch(/<p(?=[^>]*data-slot="project-description")(?=[^>]*\bmin-h-12\b)[^>]*>/)
    expect(markup).not.toContain('No description')
  })

  it('renders full-height wrappers for card cells', async () => {
    const { ProjectList } = await import('./project-list')

    const markup = renderToStaticMarkup(
      <ProjectList
        projects={[
          {
            project: makeProject('A short summary'),
            taskCount: 4,
            runningCount: 0,
          },
        ]}
      />,
    )

    expect(markup).toMatch(/<div(?=[^>]*data-slot="project-card-cell")(?=[^>]*\bh-full\b)[^>]*>/)
    expect(markup).toContain('block h-full')
  })
})
