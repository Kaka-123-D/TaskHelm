import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Task } from '@taskhelm/core'

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/task-row', () => ({
  TaskRow: ({ task }: { task: Task }) => <div data-slot="task-row">{task.title}</div>,
}))

function makeTask(title: string): Task {
  return {
    id: `task-${title}`,
    project_id: 'project-1',
    key: null,
    title,
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
    created_at: '2026-04-15T00:00:00.000Z',
    updated_at: '2026-04-15T00:00:00.000Z',
  }
}

describe('TaskList', () => {
  it('does not render the redundant task-count toolbar copy', async () => {
    const { TaskList } = await import('./task-list')
    const markup = renderToStaticMarkup(
      <TaskList tasks={[makeTask('One task')]} projectSlug="alpha" />,
    )

    expect(markup).not.toContain('1 task')
    expect(markup).not.toContain('All')
    expect(markup).not.toContain('Draft')
  })
})
