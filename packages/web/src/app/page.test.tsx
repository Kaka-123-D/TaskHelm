import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getDb: () => ({}),
}))

vi.mock('@taskhelm/core', () => ({
  ProjectRepository: vi.fn().mockImplementation(() => ({
    findAll: () => [],
  })),
  TaskRepository: vi.fn().mockImplementation(() => ({
    findByProjectId: () => [],
  })),
}))

vi.mock('@/components/page-transition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/create-project-form', () => ({
  CreateProjectForm: () => <div data-slot="create-project-form" />,
}))

vi.mock('@/components/project-list', () => ({
  ProjectList: () => <div data-slot="project-list" />,
}))

describe('HomePage shell', () => {
  it('renders the projects page shell hook and the new workbench header content', async () => {
    const HomePage = (await import('./page')).default

    const markup = renderToStaticMarkup(<HomePage />)

    expect(markup).toContain('data-slot="projects-page-shell"')
    expect(markup).toContain('class="projects-page-shell"')
    expect(markup).toContain('Workspace view')
    expect(markup).toContain('Tracked repos')
  })
})
