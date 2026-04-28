import { describe, expect, it } from 'vitest'
import type { Task } from '@taskhelm/core'
import {
  normalizeWorkspaceSubrepoBranches,
  parseWorkspaceSubrepoBranches,
  serializeWorkspaceSubrepoBranches,
  workspaceNameExistsInProject,
} from '@/lib/workspace/runtime-settings'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    key: null,
    title: 'Ship auth',
    goal: null,
    refer_link: null,
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
    created_at: '2026-04-14T00:00:00.000Z',
    updated_at: '2026-04-14T00:00:00.000Z',
    ...overrides,
  }
}

describe('workspace runtime settings', () => {
  it('parses and serializes subrepo branch overrides', () => {
    const parsed = parseWorkspaceSubrepoBranches(
      JSON.stringify([{ repoPath: 'packages/ui', branch: 'feature/ui' }]),
    )

    expect(parsed).toEqual([{ repoPath: 'packages/ui', branch: 'feature/ui' }])
    expect(serializeWorkspaceSubrepoBranches(parsed)).toBe(
      JSON.stringify([{ repoPath: 'packages/ui', branch: 'feature/ui' }]),
    )
  })

  it('drops stale or blank subrepo overrides during normalization', () => {
    expect(
      normalizeWorkspaceSubrepoBranches(
        [
          { repoPath: 'packages/ui', branch: ' feature/ui ' },
          { repoPath: 'packages/missing', branch: 'feature/missing' },
          { repoPath: 'packages/api', branch: '   ' },
        ],
        ['packages/ui', 'packages/api'],
      ),
    ).toEqual([{ repoPath: 'packages/ui', branch: 'feature/ui' }])
  })

  it('checks workspace-name uniqueness inside a project', () => {
    expect(
      workspaceNameExistsInProject(
        [
          makeTask({ id: 'task-1', workspace_name: 'alpha-ui' }),
          makeTask({ id: 'task-2', workspace_name: 'beta-ui' }),
        ],
        ' alpha-ui ',
        'task-2',
      ),
    ).toBe(true)
  })
})
