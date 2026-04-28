import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Task } from '@taskhelm/core'

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
      layout: _layout,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.ComponentPropsWithoutRef<'div'> & {
      layout?: unknown
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/design-system/glass-modal', () => ({
  GlassModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-slot="glass-modal">{children}</div> : null,
}))

vi.mock('@/components/delete-confirm', () => ({
  DeleteConfirm: ({ label }: { label: string }) => <div data-slot="delete-confirm">{label}</div>,
}))

vi.mock('@/components/design-system/glass-button', () => ({
  GlassButton: ({
    children,
    loading: _loading,
    ...props
  }: React.ComponentPropsWithoutRef<'button'> & { loading?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/design-system/port-badge', () => ({
  PortBadge: ({ port }: { port: number }) => <span data-slot="port-badge">{port}</span>,
}))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    key: null,
    title: 'Ship auth',
    goal: 'Finish the login flow',
    refer_link: null,
    priority: 3,
    branch_name: null,
    workspace_name: 'alpha-ui',
    workspace_branch: 'feat/task-1',
    workspace_subrepo_branches_json: null,
    preferred_port: 4555,
    worktree_path: '/repo/.worktrees/alpha-ui',
    port: null,
    dev_server_state: null,
    context_vault_root_path: null,
    context_vault_sources_json: null,
    context_vault_files_json: null,
    context_vault_selected_file: null,
    latest_blocker: null,
    created_at: '2026-04-14T00:00:00.000Z',
    updated_at: '2026-04-14T00:00:00.000Z',
    ...overrides,
  }
}

describe('TaskRow', () => {
  it('renders saved runtime metadata and actions', async () => {
    const { TaskRow } = await import('./task-row')
    const markup = renderToStaticMarkup(<TaskRow task={makeTask()} projectSlug="alpha" />)

    expect(markup).toContain('alpha-ui')
    expect(markup).toContain('feat/task-1')
    expect(markup).toContain(':4555')
    expect(markup).toContain('Normal')
    expect(markup).toContain('Start')
    expect(markup).toContain('data-slot="delete-confirm"')
  })

  it('renders stop action when the dev server is running', async () => {
    const { TaskRow } = await import('./task-row')
    const markup = renderToStaticMarkup(
      <TaskRow
        task={makeTask({ dev_server_state: 'running', port: 4555 })}
        projectSlug="alpha"
      />,
    )

    expect(markup).toContain('Stop')
  })
})
