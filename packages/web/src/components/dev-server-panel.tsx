'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { StatusDot } from '@/components/design-system/status-dot'

interface DevServerPanelProps {
  readonly task: Task
}

export function DevServerPanel({ task }: DevServerPanelProps) {
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
    <div
      className="rounded-[var(--glass-radius)] border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h4
        className="text-[10px] font-medium uppercase tracking-wider mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Dev Server
      </h4>

      <div className="flex items-center gap-2 mb-3">
        {state ? (
          <>
            <StatusDot status={state} />
            <span className="text-sm text-[var(--text-primary)]">{state}</span>
          </>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">not started</span>
        )}
        {port != null && (
          <span
            className="ml-auto font-mono text-sm px-2 py-0.5 rounded"
            style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
          >
            :{port}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 rounded-[var(--glass-radius-sm)] text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {!isRunning ? (
          <GlassButton
            variant="primary"
            onClick={handleStart}
            loading={loading}
            disabled={!task.worktree_path}
            className="text-xs px-3 py-1.5"
          >
            Start
          </GlassButton>
        ) : (
          <>
            <GlassButton variant="danger" onClick={handleStop} loading={loading} className="text-xs px-3 py-1.5">
              Stop
            </GlassButton>
            {port != null && (
              <a
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-[var(--glass-radius-sm)] text-xs font-medium transition-colors"
                style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
              >
                Open
              </a>
            )}
          </>
        )}
      </div>

      {!task.worktree_path && !state && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Initialize workspace first to enable dev server.
        </p>
      )}
    </div>
  )
}
