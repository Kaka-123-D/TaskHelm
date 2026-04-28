import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Task } from '@taskhelm/core'
import { DevServerPanelView } from '@/components/dev-server-panel'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    key: null,
    title: 'Ship auth',
    goal: 'Finish the login flow',
    refer_link: null,
    priority: 3,
    branch_name: null,
    workspace_name: null,
    workspace_branch: null,
    workspace_subrepo_branches_json: null,
    preferred_port: 4555,
    worktree_path: '/repo/.worktrees/ship-auth',
    port: null,
    dev_server_state: 'stopped',
    context_vault_root_path: null,
    context_vault_sources_json: null,
    context_vault_files_json: null,
    context_vault_selected_file: null,
    latest_blocker: null,
    created_at: '2026-04-17T00:00:00.000Z',
    updated_at: '2026-04-17T00:00:00.000Z',
    ...overrides,
  } as Task
}

describe('DevServerPanelView', () => {
  it('renders external port conflict details and a kill action when pid is available', () => {
    const markup = renderToStaticMarkup(
      <DevServerPanelView
        task={createTask()}
        loading={false}
        error={null}
        preferredPort="4555"
        conflict={{
          conflictType: 'external_port_in_use',
          port: 4555,
          process: {
            pid: 9912,
            command: 'node vite dev',
            user: 'vantienkhai',
            cwd: '/tmp/external-app',
          },
        }}
        onPreferredPortChange={() => {}}
        onSavePreferredPort={() => {}}
        onStart={() => {}}
        onStop={() => {}}
        onKillExternal={() => {}}
      />,
    )

    expect(markup).toContain('Port 4555 is already in use')
    expect(markup).toContain('node vite dev')
    expect(markup).toContain('vantienkhai')
    expect(markup).toContain('/tmp/external-app')
    expect(markup).toContain('Kill external process')
  })

  it('omits the kill action when no pid is available', () => {
    const markup = renderToStaticMarkup(
      <DevServerPanelView
        task={createTask()}
        loading={false}
        error={null}
        preferredPort="4555"
        conflict={{
          conflictType: 'external_port_in_use',
          port: 4555,
          process: {
            pid: null,
            command: 'node vite dev',
            user: 'vantienkhai',
            cwd: null,
          },
        }}
        onPreferredPortChange={() => {}}
        onSavePreferredPort={() => {}}
        onStart={() => {}}
        onStop={() => {}}
        onKillExternal={() => {}}
      />,
    )

    expect(markup).not.toContain('Kill external process')
  })
})
