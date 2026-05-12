import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Task } from '@taskhelm/core'

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
    helperText,
    value,
    ...props
  }: React.ComponentPropsWithoutRef<'input'> & {
    label?: string
    helperText?: string
    value?: string
  }) => (
    <label>
      <span>{label}</span>
      <input value={value} {...props} />
      {helperText ? <small>{helperText}</small> : null}
    </label>
  ),
}))

vi.mock('@/components/design-system/glass-select', () => ({
  GlassSelect: ({
    label,
    options,
    ...props
  }: React.ComponentPropsWithoutRef<'select'> & {
    label?: string
    options: readonly { value: string; label: string }[]
  }) => (
    <label>
      <span>{label}</span>
      <select {...props}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

const task: Task = {
  id: 'task-1',
  project_id: 'project-1',
  key: null,
  title: 'Ship auth',
  goal: 'Finish login flow',
  refer_link: 'https://example.com/tickets/42',
  priority: 3,
  branch_name: null,
  workspace_name: null,
  workspace_branch: null,
  workspace_subrepo_branches_json: null,
  preferred_port: null,
  worktree_path: null,
  port: null,
  dev_server_state: null,
  context_vault_root_path: null,
  context_vault_sources_json: null,
  context_vault_files_json: null,
  context_vault_selected_file: null,
  latest_blocker: null,
  created_at: '2026-04-16T00:00:00.000Z',
  updated_at: '2026-04-16T00:00:00.000Z',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('task forms', () => {
  it('renders Refer Link and removes legacy source fields in CreateTaskForm', async () => {
    const { CreateTaskForm } = await import('./create-task-form')
    const markup = renderToStaticMarkup(<CreateTaskForm projectId="project-1" />)

    expect(markup).toContain('Refer Link')
    expect(markup).not.toContain('Source Type')
    expect(markup).not.toContain('Source Ref')
  })

  it('marks the Worktree folder name field required when CreateTaskForm is multi-repo', async () => {
    const { CreateTaskForm } = await import('./create-task-form')
    const singleRepoMarkup = renderToStaticMarkup(
      <CreateTaskForm projectId="project-1" />
    )
    const multiRepoMarkup = renderToStaticMarkup(
      <CreateTaskForm projectId="project-1" isMultiRepo />
    )

    expect(singleRepoMarkup).toContain('Worktree folder name')
    expect(singleRepoMarkup).not.toContain('Worktree folder name *')
    expect(multiRepoMarkup).toContain('Worktree folder name *')
    expect(multiRepoMarkup).toContain('.worktrees/&lt;name&gt;/')
  })

  it('renders Refer Link and removes legacy source fields in EditTaskForm', async () => {
    const { EditTaskForm } = await import('./edit-task-form')
    const markup = renderToStaticMarkup(<EditTaskForm task={task} projectSlug="alpha" />)

    expect(markup).toContain('Refer Link')
    expect(markup).not.toContain('Source Type')
    expect(markup).not.toContain('Source Ref')
  })
})
