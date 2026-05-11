'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'
import { SubrepoRow, type SubrepoRowState } from '@/components/workspace-panel/subrepo-row'

interface ExistingWorktreeOption {
  readonly path: string
  readonly name: string
  readonly branch: string
}

interface WorkspaceSettingsResponse {
  readonly settings: {
    readonly workspaceName: string
    readonly workspaceBranch: string
    readonly baseBranch?: string
    readonly autoPullBaseBranch?: boolean
    readonly preferredPort: number | null
    readonly subrepoBranches: readonly { repoPath: string; branch: string }[]
  }
  readonly detectedSubrepos: readonly string[]
  readonly availableBaseBranches?: readonly string[]
  readonly availableExistingWorktrees: readonly ExistingWorktreeOption[]
  readonly subrepos?: readonly SubrepoRowState[]
}

interface SubrepoEditableState {
  readonly portInput: string
  readonly devCommandInput: string
  readonly selectedExistingWorktreePath: string
}

interface WorkspacePanelProps {
  readonly task: Task
}

export function WorkspacePanel({ task }: WorkspacePanelProps) {
  const [isFetching, setIsFetching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const loading = isFetching || isPending
  const [error, setError] = useState<string | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState(task.workspace_name ?? '')
  const [workspaceBranch, setWorkspaceBranch] = useState(task.workspace_branch ?? '')
  const [baseBranch, setBaseBranch] = useState('')
  const [availableBaseBranches, setAvailableBaseBranches] = useState<readonly string[]>([])
  const [autoPullBaseBranch, setAutoPullBaseBranch] = useState(true)
  const [recoverableBaseBranchError, setRecoverableBaseBranchError] = useState<string | null>(null)
  const [subrepoBranches, setSubrepoBranches] = useState<Record<string, string>>({})
  const [detectedSubrepos, setDetectedSubrepos] = useState<readonly string[]>([])
  const [availableExistingWorktrees, setAvailableExistingWorktrees] = useState<
    readonly ExistingWorktreeOption[]
  >([])
  const [selectedExistingWorktreePath, setSelectedExistingWorktreePath] = useState('')
  const [subrepoStates, setSubrepoStates] = useState<readonly SubrepoRowState[]>([])
  const [subrepoEditable, setSubrepoEditable] = useState<Record<string, SubrepoEditableState>>({})
  const [busySubrepoId, setBusySubrepoId] = useState<string | null>(null)
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
        setBaseBranch(payload.settings.baseBranch ?? '')
        setAutoPullBaseBranch(payload.settings.autoPullBaseBranch ?? true)
        setAvailableBaseBranches(payload.availableBaseBranches ?? [])
        setDetectedSubrepos(payload.detectedSubrepos)
        setAvailableExistingWorktrees(payload.availableExistingWorktrees)
        setSubrepoBranches(
          Object.fromEntries(payload.settings.subrepoBranches.map(entry => [entry.repoPath, entry.branch])),
        )
        const subrepos = payload.subrepos ?? []
        setSubrepoStates(subrepos)
        setSubrepoEditable(
          Object.fromEntries(
            subrepos.map(subrepo => [
              subrepo.repoPath,
              {
                portInput: subrepo.preferredPort != null ? String(subrepo.preferredPort) : '',
                devCommandInput: subrepo.devCommand ?? '',
                selectedExistingWorktreePath: '',
              },
            ]),
          ),
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
    // Subrepo init/attach/save now live in the standalone SubreposPanel;
    // the outer Workspace flow only persists the outer worktree state.
    return {
      workspaceName,
      workspaceBranch,
      baseBranch,
      autoPullBaseBranch,
    }
  }, [autoPullBaseBranch, baseBranch, workspaceBranch, workspaceName])

  const handleSave = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setRecoverableBaseBranchError(null)
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
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [buildWorkspacePayload, router, task.id])

  const handleInit = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setRecoverableBaseBranchError(null)
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
        if (data.canForceRefresh) {
          setRecoverableBaseBranchError(data.error ?? 'Failed to prepare the selected base branch')
        }
        throw new Error(data.error ?? 'Failed to init workspace')
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [buildWorkspacePayload, router, selectedExistingWorktreePath, task.id])

  const handleCleanup = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setRecoverableBaseBranchError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to cleanup workspace')
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
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

  const reloadSubrepoState = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/workspace`)
      const payload = (await response.json()) as WorkspaceSettingsResponse & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to reload subrepo state')
      }
      const subrepos = payload.subrepos ?? []
      setSubrepoStates(subrepos)
      setSubrepoEditable(prev => {
        const next: Record<string, SubrepoEditableState> = {}
        for (const subrepo of subrepos) {
          const previous = prev[subrepo.repoPath]
          next[subrepo.repoPath] = {
            portInput:
              previous?.portInput ??
              (subrepo.preferredPort != null ? String(subrepo.preferredPort) : ''),
            devCommandInput: previous?.devCommandInput ?? subrepo.devCommand ?? '',
            selectedExistingWorktreePath: previous?.selectedExistingWorktreePath ?? '',
          }
        }
        return next
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [task.id])

  const handleStartSubrepoDev = useCallback(
    async (subrepo: SubrepoRowState) => {
      if (!subrepo.id) return
      const editable = subrepoEditable[subrepo.repoPath]
      setBusySubrepoId(subrepo.id)
      setError(null)
      try {
        const portValue = editable?.portInput.trim()
        const devCommandValue = editable?.devCommandInput.trim()
        const res = await fetch(`/api/tasks/${task.id}/subrepos/${subrepo.id}/dev`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferredPort: portValue ? Number(portValue) : undefined,
            devCommand: devCommandValue || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to start dev' }))
          throw new Error(data.error ?? 'Failed to start dev')
        }
        await reloadSubrepoState()
        startTransition(() => router.refresh())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusySubrepoId(null)
      }
    },
    [reloadSubrepoState, router, subrepoEditable, task.id],
  )

  const handleStopSubrepoDev = useCallback(
    async (subrepo: SubrepoRowState) => {
      if (!subrepo.id) return
      setBusySubrepoId(subrepo.id)
      setError(null)
      try {
        const res = await fetch(`/api/tasks/${task.id}/subrepos/${subrepo.id}/dev`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to stop dev' }))
          throw new Error(data.error ?? 'Failed to stop dev')
        }
        await reloadSubrepoState()
        startTransition(() => router.refresh())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusySubrepoId(null)
      }
    },
    [reloadSubrepoState, router, task.id],
  )

  const handleRetryWithForceRefresh = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildWorkspacePayload(),
          existingWorktreePath: selectedExistingWorktreePath || undefined,
          forceRefreshBaseBranch: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to init workspace after force refresh')
      }
      setRecoverableBaseBranchError(null)
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [buildWorkspacePayload, router, selectedExistingWorktreePath, task.id])

  return (
    <WorkspacePanelView
      task={task}
      loading={loading}
      settingsLoading={settingsLoading}
      error={error}
      workspaceName={workspaceName}
      workspaceBranch={workspaceBranch}
      baseBranch={baseBranch}
      availableBaseBranches={availableBaseBranches}
      autoPullBaseBranch={autoPullBaseBranch}
      recoverableBaseBranchError={recoverableBaseBranchError}
      subrepoBranches={subrepoBranches}
      detectedSubrepos={detectedSubrepos}
      availableExistingWorktrees={availableExistingWorktrees}
      selectedExistingWorktreePath={selectedExistingWorktreePath}
      subrepoStates={subrepoStates}
      subrepoEditable={subrepoEditable}
      busySubrepoId={busySubrepoId}
      onWorkspaceNameChange={setWorkspaceName}
      onWorkspaceBranchChange={setWorkspaceBranch}
      onBaseBranchChange={setBaseBranch}
      onAutoPullBaseBranchChange={setAutoPullBaseBranch}
      onSubrepoBranchChange={(repoPath, branch) =>
        setSubrepoBranches(prev => ({ ...prev, [repoPath]: branch }))
      }
      onSubrepoPortChange={(repoPath, value) =>
        setSubrepoEditable(prev => ({
          ...prev,
          [repoPath]: {
            ...(prev[repoPath] ?? { portInput: '', devCommandInput: '', selectedExistingWorktreePath: '' }),
            portInput: value,
          },
        }))
      }
      onSubrepoDevCommandChange={(repoPath, value) =>
        setSubrepoEditable(prev => ({
          ...prev,
          [repoPath]: {
            ...(prev[repoPath] ?? { portInput: '', devCommandInput: '', selectedExistingWorktreePath: '' }),
            devCommandInput: value,
          },
        }))
      }
      onSubrepoExistingWorktreeChange={(repoPath, value) =>
        setSubrepoEditable(prev => ({
          ...prev,
          [repoPath]: {
            ...(prev[repoPath] ?? { portInput: '', devCommandInput: '', selectedExistingWorktreePath: '' }),
            selectedExistingWorktreePath: value,
          },
        }))
      }
      onSubrepoStartDev={handleStartSubrepoDev}
      onSubrepoStopDev={handleStopSubrepoDev}
      onSelectedExistingWorktreeChange={handleSelectExistingWorktree}
      onRetryWithForceRefresh={handleRetryWithForceRefresh}
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
  readonly baseBranch: string
  readonly availableBaseBranches: readonly string[]
  readonly autoPullBaseBranch: boolean
  readonly recoverableBaseBranchError: string | null
  readonly subrepoBranches: Readonly<Record<string, string>>
  readonly detectedSubrepos: readonly string[]
  readonly availableExistingWorktrees: readonly ExistingWorktreeOption[]
  readonly selectedExistingWorktreePath: string
  readonly subrepoStates?: readonly SubrepoRowState[]
  readonly subrepoEditable?: Readonly<Record<string, SubrepoEditableState>>
  readonly busySubrepoId?: string | null
  readonly onWorkspaceNameChange: (value: string) => void
  readonly onWorkspaceBranchChange: (value: string) => void
  readonly onBaseBranchChange: (value: string) => void
  readonly onAutoPullBaseBranchChange: (value: boolean) => void
  readonly onSubrepoBranchChange: (repoPath: string, branch: string) => void
  readonly onSubrepoPortChange?: (repoPath: string, value: string) => void
  readonly onSubrepoDevCommandChange?: (repoPath: string, value: string) => void
  readonly onSubrepoExistingWorktreeChange?: (repoPath: string, value: string) => void
  readonly onSubrepoStartDev?: (subrepo: SubrepoRowState) => void
  readonly onSubrepoStopDev?: (subrepo: SubrepoRowState) => void
  readonly onSelectedExistingWorktreeChange: (worktreePath: string) => void
  readonly onRetryWithForceRefresh: () => void
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
  baseBranch,
  availableBaseBranches,
  autoPullBaseBranch,
  recoverableBaseBranchError,
  subrepoBranches,
  detectedSubrepos,
  availableExistingWorktrees,
  selectedExistingWorktreePath,
  subrepoStates = [],
  subrepoEditable = {},
  busySubrepoId = null,
  onWorkspaceNameChange,
  onWorkspaceBranchChange,
  onBaseBranchChange,
  onAutoPullBaseBranchChange,
  onSubrepoBranchChange,
  onSubrepoPortChange,
  onSubrepoDevCommandChange,
  onSubrepoExistingWorktreeChange,
  onSubrepoStartDev,
  onSubrepoStopDev,
  onSelectedExistingWorktreeChange,
  onRetryWithForceRefresh,
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
  const branchWillBeCreated =
    workspaceBranch.trim().length > 0 && !availableBaseBranches.includes(workspaceBranch.trim())

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
          <GlassInput
            label="Base Branch"
            value={baseBranch}
            onChange={event => onBaseBranchChange(event.target.value)}
            placeholder="main"
            list="workspace-base-branch-options"
          />
          <datalist id="workspace-base-branch-options">
            {availableBaseBranches.map(branch => (
              <option key={branch} value={branch} />
            ))}
          </datalist>
          <label className="workspace-toggle-row">
            <input
              type="checkbox"
              checked={autoPullBaseBranch}
              onChange={event => onAutoPullBaseBranchChange(event.target.checked)}
            />
            <span>Auto-pull latest from base branch</span>
          </label>
          {branchWillBeCreated ? (
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              This branch does not exist yet. It will be created from "{baseBranch}".
            </p>
          ) : null}

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

        </div>
      </div>

      {error && <div className="utility-panel-error">{error}</div>}
      {recoverableBaseBranchError ? (
        <div className="utility-panel-error">
          <p>{recoverableBaseBranchError}</p>
          <div className="mt-2">
            <GlassButton variant="secondary" onClick={onRetryWithForceRefresh} className="text-xs px-3 py-1.5">
              Force Refresh Base Branch
            </GlassButton>
          </div>
        </div>
      ) : null}

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
