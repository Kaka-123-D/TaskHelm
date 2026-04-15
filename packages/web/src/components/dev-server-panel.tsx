'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassInput } from '@/components/design-system/glass-input'
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
  const [preferredPort, setPreferredPort] = useState(
    task.preferred_port != null ? String(task.preferred_port) : '',
  )
  const isRunning = state === 'running' || state === 'warm'

  const handleSavePreferredPort = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_port: preferredPort.trim() ? Number(preferredPort) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save preferred port')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [preferredPort, router, task.id])

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredPort: preferredPort.trim() ? Number(preferredPort) : null,
        }),
      })
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
  }, [preferredPort, router, task.id])

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
    <div className="utility-panel">
      <div className="utility-panel-header">
        <h4 className="task-pane-label">Dev Server</h4>
      </div>

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

      {error && <div className="utility-panel-error">{error}</div>}

      <div className="mb-3">
        <GlassInput
          label="Preferred Port"
          inputMode="numeric"
          value={preferredPort}
          onChange={event => setPreferredPort(event.target.value.replace(/[^\d]/g, ''))}
          placeholder="3001"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <GlassButton
          variant="secondary"
          onClick={handleSavePreferredPort}
          loading={loading}
          className="text-xs px-3 py-1.5"
        >
          Save Port
        </GlassButton>
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
                className="inline-flex items-center rounded-[var(--glass-radius-sm)] border px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent-ink)', borderColor: 'rgba(47, 109, 246, 0.12)' }}
              >
                Open
              </a>
            )}
          </>
        )}
      </div>

      {!task.worktree_path && !state && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Initialize workspace first to enable dev server.
        </p>
      )}
    </div>
  )
}
