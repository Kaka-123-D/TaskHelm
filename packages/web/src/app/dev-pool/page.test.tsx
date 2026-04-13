import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  getDb: () => ({}),
}))

vi.mock('@taskhelm/core', () => ({
  ProjectRepository: vi.fn().mockImplementation(() => ({
    findAll: () => [{ id: 'project-1', slug: 'alpha', name: 'Alpha' }],
  })),
  TaskRepository: vi.fn().mockImplementation(() => ({
    findById: () => ({ title: 'Ship auth' }),
  })),
}))

vi.mock('@taskhelm/supervisor', () => ({
  getPoolStatus: () => ({
    servers: [
      {
        task_id: 'task-1',
        port: 4301,
        pid: 1234,
        status: 'running',
        started_at: '2026-04-12T00:00:00.000Z',
      },
    ],
  }),
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

describe('DevPoolPage workbench shell', () => {
  it('renders the operations hero and runtime inventory table shell', async () => {
    const DevPoolPage = (await import('./page')).default

    const markup = renderToStaticMarkup(<DevPoolPage />)

    expect(markup).toContain('Operations View')
    expect(markup).toContain('Runtime Inventory')
    expect(markup).toContain('Ship auth')
    expect(markup).toContain('Alpha')
  })
})
