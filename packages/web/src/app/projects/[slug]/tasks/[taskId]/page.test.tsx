import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getDb: () => ({}),
}))

vi.mock('@taskhelm/core', () => ({
  ProjectRepository: vi.fn().mockImplementation(() => ({
    findBySlug: () => ({
      id: 'project-1',
      slug: 'alpha',
      name: 'Alpha',
      local_repo_root: '/repo/alpha',
      default_branch: null,
      branch_naming_pattern: null,
      worktree_root: null,
      dev_command: null,
      install_command: null,
      max_active_dev_servers: 1,
    is_multi_repo: false,
    }),
  })),
  TaskRepository: vi.fn().mockImplementation(() => ({
    findById: () => ({
      id: 'task-1',
      project_id: 'project-1',
      title: 'Ship auth',
      goal: 'Finish the login flow',
      refer_link: 'https://example.com/tickets/42',
      priority: 3,
      branch_name: null,
      workspace_name: 'alpha-ui',
      workspace_branch: 'feat/task-1',
      workspace_subrepo_branches_json: null,
      preferred_port: 4555,
      worktree_path: null,
      dev_server_state: null,
      port: null,
    }),
    delete: vi.fn(),
  })),
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/design-system/breadcrumb', () => ({
  Breadcrumb: () => <div data-slot="breadcrumb" />,
}))

vi.mock('@/components/design-system/port-badge', () => ({
  PortBadge: ({ port }: { port: number }) => <span data-slot="port-badge">{port}</span>,
}))

vi.mock('@/components/task-detail-panels', () => ({
  TaskDetailPanels: () => <div data-slot="task-detail-panels" />,
}))

vi.mock('@/components/edit-task-form', () => ({
  EditTaskForm: () => <div data-slot="edit-task-form" />,
}))

vi.mock('@/components/delete-confirm', () => ({
  DeleteConfirm: ({ redirectHref }: { redirectHref?: string }) => (
    <div data-slot="delete-confirm" data-redirect-href={redirectHref} />
  ),
}))

describe('TaskPage workbench shell', () => {
  it('renders the task work item hero without the extra execution surface wrapper', async () => {
    const TaskPage = (await import('./page')).default

    const markup = renderToStaticMarkup(
      await TaskPage({ params: Promise.resolve({ slug: 'alpha', taskId: 'task-1' }) }),
    )

    expect(markup).toContain('Task Work Item')
    expect(markup).not.toContain('Execution Surface')
    expect(markup).not.toContain('Read context, preview artifacts, and manage workspace/runtime from one workbench.')
    expect(markup).toContain('Ship auth')
    expect(markup).toContain('Normal')
    expect(markup).toContain('Refer Link')
    expect(markup).toContain('href="https://example.com/tickets/42"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('alpha-ui')
    expect(markup).toContain('feat/task-1')
    expect(markup).toContain(':4555 saved')
    expect(markup).toContain('data-slot="task-detail-panels"')
    expect(markup).toContain('data-redirect-href="/projects/alpha"')
    expect(markup).not.toContain('data-slot="status-badge"')
  })
})
