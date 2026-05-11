import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Project, Task } from '@taskhelm/core'
import { TaskDetailPanelsView } from '@/components/task-detail-panels'
import { vi } from 'vitest'

vi.mock('@/components/workspace-panel', () => ({
  WorkspacePanel: () => <div data-slot="workspace-panel" />,
}))

vi.mock('@/components/dev-server-panel', () => ({
  DevServerPanel: () => <div data-slot="dev-server-panel" />,
}))

vi.mock('@/components/subrepos-panel', () => ({
  SubreposPanel: () => <div data-slot="subrepos-panel" />,
}))

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    slug: 'alpha',
    name: 'Alpha',
    description: null,
    local_repo_root: '/repo/alpha',
    default_branch: null,
    branch_naming_pattern: null,
    worktree_root: null,
    dev_command: null,
    install_command: null,
    max_active_dev_servers: 1,
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T00:00:00.000Z',
    ...overrides,
  } as Project
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    key: null,
    title: 'Ship auth',
    goal: 'Finish the login flow',
    refer_link: null,
    priority: 2,
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
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T00:00:00.000Z',
    ...overrides,
  } as Task
}

describe('TaskDetailPanelsView', () => {
  it('renders a local-only context vault shell when nothing is linked yet', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={createTask()}
        project={createProject()}
        rootPath={null}
        sourceCount={0}
        files={[]}
        selectedFile={null}
        statusMessage={null}
        fileListCollapsed={false}
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).toContain('Local only')
    expect(markup).toContain('No local context linked yet')
    expect(markup).toContain('Explore Context Vault')
  })

  it('renders linked local root and tracking summary once files are loaded', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={createTask()}
        project={createProject()}
        rootPath="/repo/alpha/docs"
        sourceCount={1}
        files={[
          {
            relativePath: 'guides/context.md',
            absolutePath: '/tmp/vault-root/guides/context.md',
            content: '# Context',
            category: 'markdown',
            mediaType: 'text/markdown',
          },
        ]}
        selectedFile="guides/context.md"
        statusMessage="Loaded 1 context file from the local filesystem."
        fileListCollapsed={false}
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).toContain('guides/context.md')
    expect(markup).toContain('/repo/alpha/docs')
    expect(markup).toContain('Loaded 1 context file from the local filesystem.')
    expect(markup).toContain('Update Vault')
    expect(markup).toContain('aria-label="Collapse file list"')
    expect(markup).toContain('refreshes from the linked local source every 30 seconds')
  })

  it('does not show the execution-surface loading copy once files already exist', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={createTask()}
        project={createProject()}
        rootPath="/repo/alpha/docs"
        sourceCount={1}
        files={[
          {
            relativePath: 'guides/context.md',
            absolutePath: '/tmp/vault-root/guides/context.md',
            content: '# Context',
            category: 'markdown',
            mediaType: 'text/markdown',
          },
        ]}
        selectedFile="guides/context.md"
        statusMessage={null}
        loading
        fileListCollapsed={false}
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).not.toContain('Loading execution surface...')
  })

  it('renders an expand control when the file list is collapsed', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={createTask()}
        project={createProject()}
        rootPath="/repo/alpha/docs"
        sourceCount={1}
        files={[
          {
            relativePath: 'guides/context.md',
            absolutePath: '/tmp/vault-root/guides/context.md',
            content: '# Context',
            category: 'markdown',
            mediaType: 'text/markdown',
          },
        ]}
        selectedFile="guides/context.md"
        statusMessage={null}
        fileListCollapsed
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).toContain('aria-label="Expand file list"')
    expect(markup).toContain('data-state="collapsed"')
  })

  it('renders the stacked task-detail layout hook for laptop view', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={createTask()}
        project={createProject()}
        rootPath="/repo/alpha/docs"
        sourceCount={1}
        files={[
          {
            relativePath: 'guides/context.md',
            absolutePath: '/tmp/vault-root/guides/context.md',
            content: '# Context',
            category: 'markdown',
            mediaType: 'text/markdown',
          },
        ]}
        selectedFile="guides/context.md"
        statusMessage={null}
        forceLayoutMode="stacked"
        fileListCollapsed={false}
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).toContain('data-layout="stacked"')
    expect(markup).toContain('data-slot="task-detail-sidebar"')
    expect(markup).toContain('data-slot="task-detail-main"')
    expect(markup).toContain('data-list-mode="popover"')
    expect(markup).toContain('aria-label="Open context file picker"')
  })

  it('renders a floating file picker trigger when list mode switches to popover', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={createTask()}
        project={createProject()}
        rootPath="/repo/alpha/docs"
        sourceCount={1}
        files={[
          {
            relativePath: 'guides/context.md',
            absolutePath: '/tmp/vault-root/guides/context.md',
            content: '# Context',
            category: 'markdown',
            mediaType: 'text/markdown',
          },
        ]}
        selectedFile="guides/context.md"
        statusMessage={null}
        forceFileListMode="popover"
        fileListCollapsed={false}
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).toContain('data-list-mode="popover"')
    expect(markup).toContain('aria-label="Open context file picker"')
  })
})
