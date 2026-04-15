import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Task } from '@taskhelm/core'

vi.mock('@/components/design-system/glass-button', () => ({
  GlassButton: ({
    children,
    loading: _loading,
    ...props
  }: React.ComponentPropsWithoutRef<'button'> & { loading?: boolean }) => (
    <button {...props}>{children}</button>
  ),
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

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    key: null,
    title: 'Ship auth',
    goal: null,
    source_type: null,
    source_ref: null,
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
    current_agent_run_id: null,
    latest_blocker: null,
    created_at: '2026-04-14T00:00:00.000Z',
    updated_at: '2026-04-14T00:00:00.000Z',
    ...overrides,
  }
}

describe('WorkspacePanelView', () => {
  it('renders an attach-existing selector when unassigned worktrees are available', async () => {
    const { WorkspacePanelView } = await import('./workspace-panel')
    const markup = renderToStaticMarkup(
      <WorkspacePanelView
        task={makeTask()}
        loading={false}
        settingsLoading={false}
        error={null}
        workspaceName=""
        workspaceBranch=""
        subrepoBranches={{}}
        detectedSubrepos={[]}
        availableExistingWorktrees={[
          {
            path: '/repo/.worktrees/feature-free',
            name: 'feature-free',
            branch: 'feature/free',
          },
        ]}
        selectedExistingWorktreePath="/repo/.worktrees/feature-free"
        onWorkspaceNameChange={() => {}}
        onWorkspaceBranchChange={() => {}}
        onSubrepoBranchChange={() => {}}
        onSelectedExistingWorktreeChange={() => {}}
        onSave={() => {}}
        onInitOrAttach={() => {}}
        onCleanup={() => {}}
      />,
    )

    expect(markup).toContain('Attach Existing Worktree')
    expect(markup).toContain('feature-free')
    expect(markup).toContain('Attach Workspace')
  })

  it('hides the attach-existing selector when no unassigned worktrees are available', async () => {
    const { WorkspacePanelView } = await import('./workspace-panel')
    const markup = renderToStaticMarkup(
      <WorkspacePanelView
        task={makeTask()}
        loading={false}
        settingsLoading={false}
        error={null}
        workspaceName=""
        workspaceBranch=""
        subrepoBranches={{}}
        detectedSubrepos={[]}
        availableExistingWorktrees={[]}
        selectedExistingWorktreePath=""
        onWorkspaceNameChange={() => {}}
        onWorkspaceBranchChange={() => {}}
        onSubrepoBranchChange={() => {}}
        onSelectedExistingWorktreeChange={() => {}}
        onSave={() => {}}
        onInitOrAttach={() => {}}
        onCleanup={() => {}}
      />,
    )

    expect(markup).not.toContain('Attach Existing Worktree')
    expect(markup).toContain('Init Workspace')
  })
})
