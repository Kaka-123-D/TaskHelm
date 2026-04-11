'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'

interface WorkspaceControlsProps {
  readonly task: Task
}

export function WorkspaceControls({ task }: WorkspaceControlsProps) {
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
    <div className="space-y-3">
      <div className="divide-y divide-zinc-800/60">
        <div className="flex items-start gap-3 py-1.5">
          <span className="text-sm text-zinc-500 w-36 shrink-0">Branch</span>
          <span className="text-sm text-zinc-200">
            {task.branch_name ? (
              <span className="font-mono">{task.branch_name}</span>
            ) : (
              <span className="text-zinc-600">not assigned</span>
            )}
          </span>
        </div>
        {task.worktree_path && (
          <div className="flex items-start gap-3 py-1.5">
            <span className="text-sm text-zinc-500 w-36 shrink-0">Worktree</span>
            <span className="font-mono text-xs text-zinc-400 break-all">{task.worktree_path}</span>
          </div>
        )}
        {task.port != null && (
          <div className="flex items-start gap-3 py-1.5">
            <span className="text-sm text-zinc-500 w-36 shrink-0">Port</span>
            <span className="font-mono text-sm text-zinc-200">{task.port}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {!hasWorkspace ? (
          <button
            onClick={handleInit}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Initializing...' : 'Init Workspace'}
          </button>
        ) : (
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded border border-red-900 text-red-400 hover:text-red-300 hover:border-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cleaning up...' : 'Cleanup Workspace'}
          </button>
        )}
      </div>
    </div>
  )
}
