'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'

interface WorkspacePanelProps {
  readonly task: Task
}

export function WorkspacePanel({ task }: WorkspacePanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const hasWorkspace = task.branch_name !== null && task.worktree_path !== null

  const handleInit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`, { method: 'POST' })
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
  }, [task.id, router])

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

  return (
    <div className="utility-panel">
      <div className="utility-panel-header">
        <h4 className="task-pane-label">Workspace</h4>
      </div>

      {hasWorkspace ? (
        <div className="space-y-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Branch</span>
            <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">{task.branch_name}</div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Worktree</span>
            <div className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">{task.worktree_path}</div>
          </div>
        </div>
      ) : (
        <p className="utility-panel-copy">No workspace initialized yet. Create one when the task is ready for active implementation.</p>
      )}

      {error && <div className="utility-panel-error">{error}</div>}

      <div className="mt-3">
        {!hasWorkspace ? (
          <GlassButton variant="primary" onClick={handleInit} loading={loading} className="text-xs px-3 py-1.5">
            Init Workspace
          </GlassButton>
        ) : (
          <GlassButton variant="danger" onClick={handleCleanup} loading={loading} className="text-xs px-3 py-1.5">
            Cleanup
          </GlassButton>
        )}
      </div>
    </div>
  )
}
