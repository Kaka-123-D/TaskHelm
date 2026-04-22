import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@taskhelm/core'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('@/components/design-system/glass-modal', () => ({
  GlassModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/design-system/glass-input', () => ({
  GlassInput: ({
    label,
    value,
    ...props
  }: React.ComponentPropsWithoutRef<'input'> & { label?: string; value?: string }) => (
    <label>
      <span>{label}</span>
      <input value={value} {...props} />
    </label>
  ),
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

vi.mock('@/components/folder-picker', () => ({
  FolderPicker: ({ value }: { value: string }) => <input value={value} readOnly />,
}))

const project: Project = {
  id: 'project-1',
  slug: 'alpha',
  name: 'Alpha',
  description: null,
  local_repo_root: '/repo/alpha',
  default_branch: 'main',
  branch_naming_pattern: null,
  worktree_root: null,
  dev_command: 'pnpm dev',
  install_command: 'pnpm install',
  max_active_dev_servers: 1,
  created_at: '2026-04-16T00:00:00.000Z',
  updated_at: '2026-04-16T00:00:00.000Z',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('project forms', () => {
  it('does not render Test Command in CreateProjectForm', async () => {
    const { CreateProjectForm } = await import('./create-project-form')
    const markup = renderToStaticMarkup(<CreateProjectForm />)

    expect(markup).not.toContain('Test Command')
    expect(markup).toContain('Install Command')
  })

  it('does not render Test Command in EditProjectForm', async () => {
    const { EditProjectForm } = await import('./edit-project-form')
    const markup = renderToStaticMarkup(<EditProjectForm project={project} />)

    expect(markup).not.toContain('Test Command')
    expect(markup).toContain('Install Command')
  })
})
