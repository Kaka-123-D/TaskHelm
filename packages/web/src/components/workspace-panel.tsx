'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'

interface ExistingWorktreeOption {
  readonly path: string
  readonly name: string
  readonly branch: string
}

interface WorkspaceSettingsResponse {
  readonly settings: {
    readonly workspaceName: string
    readonly workspaceBranch: string
    readonly preferredPort: number | null
    readonly subrepoBranches: readonly { repoPath: string; branch: string }[]
  }
  readonly detectedSubrepos: readonly string[]
  readonly availableExistingWorktrees: readonly ExistingWorktreeOption[]
}

interface WorkspacePanelProps {
  readonly task: Task
}

export function WorkspacePanel({ task }: WorkspacePanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState(task.workspace_name ?? '')
  const [workspaceBranch, setWorkspaceBranch] = useState(task.workspace_branch ?? '')
  const [subrepoBranches, setSubrepoBranches] = useState<Record<string, string>>({})
  const [detectedSubrepos, setDetectedSubrepos] = useState<readonly string[]>([])
  const [availableExistingWorktrees, setAvailableExistingWorktrees] = useState<
    readonly ExistingWorktreeOption[]
  >([])
  const [selectedExistingWorktreePath, setSelectedExistingWorktreePath] = useState('')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const response = await fetch(`/api/tasks/${task.id}/workspace`)
        const payload = (await response.json()) as WorkspaceSettingsResponse & { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load workspace settings')
        }
        if (cancelled) {
          return
        }

        setWorkspaceName(payload.settings.workspaceName)
        setWorkspaceBranch(payload.settings.workspaceBranch)
        setDetectedSubrepos(payload.detectedSubrepos)
        setAvailableExistingWorktrees(payload.availableExistingWorktrees)
        setSubrepoBranches(
          Object.fromEntries(payload.settings.subrepoBranches.map(entry => [entry.repoPath, entry.branch])),
        )
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
        }
      } finally {
        if (!cancelled) {
          setSettingsLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [task.id])

  const buildWorkspacePayload = useCallback(() => {
    return {
      workspaceName,
      workspaceBranch,
      subrepoBranches: detectedSubrepos
        .map(repoPath => ({ repoPath, branch: subrepoBranches[repoPath]?.trim() ?? '' }))
        .filter(entry => entry.branch.length > 0),
    }
  }, [detectedSubrepos, subrepoBranches, workspaceBranch, workspaceName])

  const handleSave = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildWorkspacePayload()),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save workspace settings')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [buildWorkspacePayload, router, task.id])

  const handleInit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildWorkspacePayload(),
          existingWorktreePath: selectedExistingWorktreePath || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to init workspace')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [buildWorkspacePayload, router, selectedExistingWorktreePath, task.id])

  const handleCleanup = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to cleanup workspace')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  const handleSelectExistingWorktree = useCallback(
    (nextPath: string) => {
      setSelectedExistingWorktreePath(nextPath)

      const selectedWorktree = availableExistingWorktrees.find(worktree => worktree.path === nextPath)
      if (!selectedWorktree) {
        return
      }

      setWorkspaceName(current => current.trim() || selectedWorktree.name)
      setWorkspaceBranch(current => current.trim() || selectedWorktree.branch)
    },
    [availableExistingWorktrees],
  )

  return (
    <WorkspacePanelView
      task={task}
      loading={loading}
      settingsLoading={settingsLoading}
      error={error}
      workspaceName={workspaceName}
      workspaceBranch={workspaceBranch}
      subrepoBranches={subrepoBranches}
      detectedSubrepos={detectedSubrepos}
      availableExistingWorktrees={availableExistingWorktrees}
      selectedExistingWorktreePath={selectedExistingWorktreePath}
      onWorkspaceNameChange={setWorkspaceName}
      onWorkspaceBranchChange={setWorkspaceBranch}
      onSubrepoBranchChange={(repoPath, branch) =>
        setSubrepoBranches(prev => ({ ...prev, [repoPath]: branch }))
      }
      onSelectedExistingWorktreeChange={handleSelectExistingWorktree}
      onSave={handleSave}
      onInitOrAttach={handleInit}
      onCleanup={handleCleanup}
    />
  )
}

interface WorkspacePanelViewProps {
  readonly task: Task
  readonly loading: boolean
  readonly settingsLoading: boolean
  readonly error: string | null
  readonly workspaceName: string
  readonly workspaceBranch: string
  readonly subrepoBranches: Readonly<Record<string, string>>
  readonly detectedSubrepos: readonly string[]
  readonly availableExistingWorktrees: readonly ExistingWorktreeOption[]
  readonly selectedExistingWorktreePath: string
  readonly onWorkspaceNameChange: (value: string) => void
  readonly onWorkspaceBranchChange: (value: string) => void
  readonly onSubrepoBranchChange: (repoPath: string, branch: string) => void
  readonly onSelectedExistingWorktreeChange: (worktreePath: string) => void
  readonly onSave: () => void
  readonly onInitOrAttach: () => void
  readonly onCleanup: () => void
}

export function WorkspacePanelView({
  task,
  loading,
  settingsLoading,
  error,
  workspaceName,
  workspaceBranch,
  subrepoBranches,
  detectedSubrepos,
  availableExistingWorktrees,
  selectedExistingWorktreePath,
  onWorkspaceNameChange,
  onWorkspaceBranchChange,
  onSubrepoBranchChange,
  onSelectedExistingWorktreeChange,
  onSave,
  onInitOrAttach,
  onCleanup,
}: WorkspacePanelViewProps) {
  const hasWorkspace = task.branch_name !== null && task.worktree_path !== null
  const hasAvailableExistingWorktrees = !hasWorkspace && availableExistingWorktrees.length > 0
  const worktreeName =
    task.workspace_name ??
    task.worktree_path?.split(/[/\\\\]/).filter(Boolean).at(-1) ??
    'Not initialized'
  const branchLabel = task.branch_name ?? task.workspace_branch ?? 'Not initialized'

  return (
    <div className="utility-panel">
      <div className="utility-panel-header">
        <h4 className="task-pane-label">Workspace</h4>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Worktree name</span>
            <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">{worktreeName}</div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Branch</span>
            <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">{branchLabel}</div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Port</span>
            <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">
              {task.port != null ? `:${task.port}` : 'Not assigned'}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Dev state</span>
            <div className="mt-1 text-sm text-[var(--text-primary)]">{task.dev_server_state ?? 'stopped'}</div>
          </div>
        </div>

        {hasWorkspace ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Worktree path</span>
            <div className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">{task.worktree_path}</div>
          </div>
        ) : (
          <p className="utility-panel-copy">No workspace initialized yet. Create one when the task is ready for active implementation.</p>
        )}

        <div className="space-y-3">
          <GlassInput
            label="Workspace Name"
            value={workspaceName}
            onChange={event => onWorkspaceNameChange(event.target.value)}
            placeholder="alpha-ui"
          />
          <GlassInput
            label="Main Repo Branch"
            value={workspaceBranch}
            onChange={event => onWorkspaceBranchChange(event.target.value)}
            placeholder="feature/alpha-ui"
          />

          {hasAvailableExistingWorktrees ? (
            <GlassSelect
              label="Attach Existing Worktree"
              value={selectedExistingWorktreePath}
              onChange={event => onSelectedExistingWorktreeChange(event.target.value)}
              options={[
                { value: '', label: 'Create a new worktree' },
                ...availableExistingWorktrees.map(worktree => ({
                  value: worktree.path,
                  label: `${worktree.name} (${worktree.branch})`,
                })),
              ]}
            />
          ) : null}

          {settingsLoading ? (
            <p className="text-xs text-[var(--text-muted)]">Loading repository map...</p>
          ) : detectedSubrepos.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Nested Repos
              </div>
              {detectedSubrepos.map(repoPath => (
                <GlassInput
                  key={repoPath}
                  label={repoPath}
                  value={subrepoBranches[repoPath] ?? ''}
                  onChange={event => onSubrepoBranchChange(repoPath, event.target.value)}
                  placeholder="feature/subrepo-branch"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error && <div className="utility-panel-error">{error}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <GlassButton variant="secondary" onClick={onSave} loading={loading} className="text-xs px-3 py-1.5">
          Save Settings
        </GlassButton>
        {!hasWorkspace ? (
          <GlassButton variant="primary" onClick={onInitOrAttach} loading={loading} className="text-xs px-3 py-1.5">
            {selectedExistingWorktreePath ? 'Attach Workspace' : 'Init Workspace'}
          </GlassButton>
        ) : (
          <GlassButton variant="danger" onClick={onCleanup} loading={loading} className="text-xs px-3 py-1.5">
            Cleanup
          </GlassButton>
        )}
      </div>
    </div>
  )
}
