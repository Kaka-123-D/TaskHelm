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
      specdown_project_ref: null,
    }),
  })),
  TaskRepository: vi.fn().mockImplementation(() => ({
    findById: () => ({
      id: 'task-1',
      project_id: 'project-1',
      title: 'Ship auth',
      goal: 'Finish the login flow',
      status: 'ready',
      priority: 2,
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

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({ value }: { value: string }) => <span data-slot="status-badge">{value}</span>,
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
  DeleteConfirm: () => <div data-slot="delete-confirm" />,
}))

describe('TaskPage workbench shell', () => {
  it('renders the execution surface hero and pane section', async () => {
    const TaskPage = (await import('./page')).default

    const markup = renderToStaticMarkup(
      await TaskPage({ params: Promise.resolve({ slug: 'alpha', taskId: 'task-1' }) }),
    )

    expect(markup).toContain('Task Work Item')
    expect(markup).toContain('Execution Surface')
    expect(markup).toContain('Ship auth')
    expect(markup).toContain('data-slot="task-detail-panels"')
  })
})
