import React from 'react'
import * as fs from 'node:fs'
import * as path from 'node:path'
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
    expect(markup).toContain('class="projects-page-actions projects-page-actions--stack"')
    expect(markup).toContain('class="projects-page-stat"')
    expect(markup).not.toContain('projects-page-stat--inline')
  })

  it('keeps both page shell width caps fluid in the stylesheet', () => {
    const globalsCss = fs.readFileSync(path.join(import.meta.dirname, 'globals.css'), 'utf8')

    expect(globalsCss).toContain('.projects-page-shell {\n  max-width: 100%;\n}')
    expect(globalsCss).toContain('.workbench-page-shell {\n  max-width: 100%;\n}')
  })
})
