'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { StatusBadge } from '@/components/status-badge'

interface DevServerControlsProps {
  task: Task
}

const STATE_DESCRIPTIONS: Record<string, string> = {
  warm: 'Server is warm and ready',
  sleeping: 'Server is sleeping to save resources',
  starting: 'Server is starting up...',
  running: 'Server is running and accepting connections',
  failed: 'Server failed to start',
  stopped: 'Server is stopped',
}

export function DevServerControls({ task }: DevServerControlsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const state = task.dev_server_state
  const port = task.port
  const isRunning = state === 'running' || state === 'warm'

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to start dev server')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  const handleStop = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to stop dev server')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [task.id, router])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">State:</span>
          {state ? (
            <StatusBadge value={state} />
          ) : (
            <span className="text-sm text-zinc-600">not started</span>
          )}
        </div>
        {port != null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Port:</span>
            <span className="font-mono text-sm text-zinc-300">{port}</span>
            {isRunning && (
              <a
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                open
              </a>
            )}
          </div>
        )}
      </div>

      {state && (
        <p className="text-xs text-zinc-500">
          {STATE_DESCRIPTIONS[state] ?? state}
        </p>
      )}

      {error && (
        <div className="p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading || !task.worktree_path}
            className="px-3 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!task.worktree_path ? 'Init workspace first' : 'Start dev server'}
          >
            {loading ? 'Starting...' : 'Start'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="px-3 py-1.5 text-xs rounded border border-red-900 text-red-400 hover:text-red-300 hover:border-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Stopping...' : 'Stop'}
          </button>
        )}
      </div>

      {!task.worktree_path && !state && (
        <p className="text-xs text-zinc-600">
          Initialize workspace first to enable dev server.
        </p>
      )}
    </div>
  )
}
