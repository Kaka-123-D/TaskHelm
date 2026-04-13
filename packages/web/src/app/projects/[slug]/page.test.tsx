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
      description: 'Workspace copy',
      local_repo_root: '/repo/alpha',
    }),
  })),
  TaskRepository: vi.fn().mockImplementation(() => ({
    findByProjectId: () => [
      { id: 'task-1', status: 'ready' },
      { id: 'task-2', status: 'running' },
    ],
  })),
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/design-system/breadcrumb', () => ({
  Breadcrumb: () => <div data-slot="breadcrumb" />,
}))

vi.mock('@/components/task-list', () => ({
  TaskList: () => <div data-slot="task-list" />,
}))

vi.mock('@/components/create-task-form', () => ({
  CreateTaskForm: () => <div data-slot="create-task-form" />,
}))

vi.mock('@/components/edit-project-form', () => ({
  EditProjectForm: () => <div data-slot="edit-project-form" />,
}))

describe('ProjectPage workbench shell', () => {
  it('renders the new project workspace hero and task rail section', async () => {
    const ProjectPage = (await import('./page')).default

    const markup = renderToStaticMarkup(await ProjectPage({ params: Promise.resolve({ slug: 'alpha' }) }))

    expect(markup).toContain('Project Workspace')
    expect(markup).toContain('Task Rail')
    expect(markup).toContain('Repo root')
    expect(markup).toContain('data-slot="task-list"')
  })
})
