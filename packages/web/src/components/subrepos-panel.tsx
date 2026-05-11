'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { SubrepoRow, type SubrepoRowState } from '@/components/workspace-panel/subrepo-row'

interface SubrepoEditableState {
  readonly branchInput: string
  readonly portInput: string
  readonly devCommandInput: string
  readonly selectedExistingWorktreePath: string
}

interface WorkspaceResponse {
  readonly detectedSubrepos: readonly string[]
  readonly subrepos?: readonly SubrepoRowState[]
  readonly error?: string
}

interface SubreposPanelProps {
  readonly task: Task
}

const EMPTY_EDITABLE: SubrepoEditableState = {
  branchInput: '',
  portInput: '',
  devCommandInput: '',
  selectedExistingWorktreePath: '',
}

export function SubreposPanel({ task }: SubreposPanelProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [detected, setDetected] = useState<readonly string[]>([])
  const [subrepos, setSubrepos] = useState<readonly SubrepoRowState[]>([])
  const [editable, setEditable] = useState<Record<string, SubrepoEditableState>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`)
      const payload = (await res.json()) as WorkspaceResponse
      if (!res.ok) throw new Error(payload.error ?? 'Failed to load subrepo state')
      setDetected(payload.detectedSubrepos)
      const rows = payload.subrepos ?? []
      setSubrepos(rows)
      setEditable(prev => {
        const next: Record<string, SubrepoEditableState> = {}
        for (const detectedPath of payload.detectedSubrepos) {
          const row = rows.find(s => s.repoPath === detectedPath)
          const previous = prev[detectedPath]
          next[detectedPath] = {
            branchInput: previous?.branchInput ?? row?.branchName ?? '',
            portInput:
              previous?.portInput ??
              (row?.preferredPort != null ? String(row.preferredPort) : ''),
            devCommandInput: previous?.devCommandInput ?? row?.devCommand ?? '',
            selectedExistingWorktreePath: previous?.selectedExistingWorktreePath ?? '',
          }
        }
        return next
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateEditable = useCallback(
    (repoPath: string, partial: Partial<SubrepoEditableState>) => {
      setEditable(prev => ({
        ...prev,
        [repoPath]: { ...(prev[repoPath] ?? EMPTY_EDITABLE), ...partial },
      }))
    },
    [],
  )

  const handleInit = useCallback(
    async (state: SubrepoRowState) => {
      const fields = editable[state.repoPath] ?? EMPTY_EDITABLE
      setBusyKey(state.repoPath)
      setError(null)
      try {
        const port = fields.portInput.trim()
        const cmd = fields.devCommandInput.trim()
        const attach = fields.selectedExistingWorktreePath.trim()
        const branch = fields.branchInput.trim() || state.branchName || ''
        const inferredAttachBranch = attach
          ? state.availableExistingWorktrees.find(o => o.path === attach)?.branch ?? ''
          : ''
        const res = await fetch(`/api/tasks/${task.id}/subrepos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoPath: state.repoPath,
            branch: branch || inferredAttachBranch,
            preferredPort: port ? Number(port) : null,
            devCommand: cmd || null,
            existingWorktreePath: attach || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to init subrepo' }))
          throw new Error(data.error ?? 'Failed to init subrepo')
        }
        await refresh()
        startTransition(() => router.refresh())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusyKey(null)
      }
    },
    [editable, refresh, router, task.id],
  )

  const handleSave = useCallback(
    async (state: SubrepoRowState) => {
      if (!state.id) return
      const fields = editable[state.repoPath] ?? EMPTY_EDITABLE
      setBusyKey(state.repoPath)
      setError(null)
      try {
        const port = fields.portInput.trim()
        const res = await fetch(`/api/tasks/${task.id}/subrepos/${state.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch: fields.branchInput.trim() || undefined,
            preferredPort: port ? Number(port) : null,
            devCommand: fields.devCommandInput.trim() || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to save subrepo' }))
          throw new Error(data.error ?? 'Failed to save subrepo')
        }
        await refresh()
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusyKey(null)
      }
    },
    [editable, refresh, task.id],
  )

  const handleCleanup = useCallback(
    async (state: SubrepoRowState) => {
      if (!state.id) return
      setBusyKey(state.repoPath)
      setError(null)
      try {
        const res = await fetch(`/api/tasks/${task.id}/subrepos/${state.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to cleanup subrepo' }))
          throw new Error(data.error ?? 'Failed to cleanup subrepo')
        }
        await refresh()
        startTransition(() => router.refresh())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusyKey(null)
      }
    },
    [refresh, router, task.id],
  )

  const handleStartDev = useCallback(
    async (state: SubrepoRowState) => {
      if (!state.id) return
      const fields = editable[state.repoPath] ?? EMPTY_EDITABLE
      setBusyKey(state.repoPath)
      setError(null)
      try {
        const port = fields.portInput.trim()
        const cmd = fields.devCommandInput.trim()
        const res = await fetch(`/api/tasks/${task.id}/subrepos/${state.id}/dev`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferredPort: port ? Number(port) : undefined,
            devCommand: cmd || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to start dev' }))
          throw new Error(data.error ?? 'Failed to start dev')
        }
        await refresh()
        startTransition(() => router.refresh())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusyKey(null)
      }
    },
    [editable, refresh, router, task.id],
  )

  const handleStopDev = useCallback(
    async (state: SubrepoRowState) => {
      if (!state.id) return
      setBusyKey(state.repoPath)
      setError(null)
      try {
        const res = await fetch(`/api/tasks/${task.id}/subrepos/${state.id}/dev`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to stop dev' }))
          throw new Error(data.error ?? 'Failed to stop dev')
        }
        await refresh()
        startTransition(() => router.refresh())
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusyKey(null)
      }
    },
    [refresh, router, task.id],
  )

  if (detected.length === 0 && !loading) return null

  return (
    <div className="utility-panel">
      <div className="utility-panel-header">
        <h4 className="task-pane-label">Subrepos</h4>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">Loading repository map...</p>
      ) : null}

      <div className="space-y-3">
        {detected.map(repoPath => {
          const state =
            subrepos.find(s => s.repoPath === repoPath) ??
            ({
              repoPath,
              id: null,
              branchName: null,
              worktreePath: null,
              preferredPort: null,
              devCommand: null,
              devServerState: null,
              availableExistingWorktrees: [],
            } satisfies SubrepoRowState)

          const fields = editable[repoPath] ?? EMPTY_EDITABLE

          return (
            <div key={repoPath} className="space-y-2">
              <SubrepoRow
                state={state}
                editable={fields}
                busy={busyKey === repoPath}
                onBranchChange={value => updateEditable(repoPath, { branchInput: value })}
                onPortChange={value => updateEditable(repoPath, { portInput: value })}
                onDevCommandChange={value =>
                  updateEditable(repoPath, { devCommandInput: value })
                }
                onSelectedExistingWorktreeChange={value =>
                  updateEditable(repoPath, { selectedExistingWorktreePath: value })
                }
                onStartDev={() => handleStartDev(state)}
                onStopDev={() => handleStopDev(state)}
              />
              <div className="flex flex-wrap gap-2">
                {state.id == null ? (
                  <GlassButton
                    variant="primary"
                    onClick={() => handleInit(state)}
                    loading={busyKey === repoPath}
                    className="text-xs px-3 py-1.5"
                  >
                    {fields.selectedExistingWorktreePath ? 'Attach Subrepo' : 'Init Subrepo'}
                  </GlassButton>
                ) : (
                  <>
                    <GlassButton
                      variant="secondary"
                      onClick={() => handleSave(state)}
                      loading={busyKey === repoPath}
                      className="text-xs px-3 py-1.5"
                    >
                      Save Settings
                    </GlassButton>
                    <GlassButton
                      variant="danger"
                      onClick={() => handleCleanup(state)}
                      loading={busyKey === repoPath}
                      className="text-xs px-3 py-1.5"
                    >
                      Cleanup
                    </GlassButton>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error ? <div className="utility-panel-error mt-2">{error}</div> : null}
    </div>
  )
}
