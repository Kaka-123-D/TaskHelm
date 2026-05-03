'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassInput } from '@/components/design-system/glass-input'
import { StatusDot } from '@/components/design-system/status-dot'

export interface ExternalPortConflict {
  readonly conflictType: 'external_port_in_use'
  readonly port: number
  readonly process: {
    readonly pid: number | null
    readonly command: string | null
    readonly user: string | null
    readonly cwd: string | null
  } | null
}

export interface StartFailureDetails {
  readonly message: string
  readonly logPath: string | null
}

interface DevServerPanelProps {
  readonly task: Task
}

export interface DevServerPanelViewProps {
  readonly task: Task
  readonly loading: boolean
  readonly error: string | null
  readonly startFailure: StartFailureDetails | null
  readonly preferredPort: string
  readonly conflict: ExternalPortConflict | null
  readonly onPreferredPortChange: (value: string) => void
  readonly onSavePreferredPort: () => void
  readonly onStart: () => void
  readonly onStop: () => void
  readonly onKillExternal: () => void
}

export function DevServerPanelView({
  task,
  loading,
  error,
  startFailure,
  preferredPort,
  conflict,
  onPreferredPortChange,
  onSavePreferredPort,
  onStart,
  onStop,
  onKillExternal,
}: DevServerPanelViewProps) {
  const state = task.dev_server_state
  const port = task.port
  const isRunning = state === 'running' || state === 'warm'

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

      {conflict ? (
        <div className="utility-panel-error">
          <div className="font-semibold">Port {conflict.port} is already in use</div>
          <div className="mt-2 space-y-1 text-xs leading-5">
            {conflict.process?.pid != null ? <div><strong>PID:</strong> {conflict.process.pid}</div> : null}
            {conflict.process?.command ? <div><strong>Command:</strong> {conflict.process.command}</div> : null}
            {conflict.process?.user ? <div><strong>User:</strong> {conflict.process.user}</div> : null}
            {conflict.process?.cwd ? <div><strong>Working directory:</strong> {conflict.process.cwd}</div> : null}
            <div>This process is outside TaskHelm. Review it before deciding whether to kill it.</div>
          </div>
          {conflict.process?.pid != null ? (
            <div className="mt-3">
              <GlassButton variant="danger" onClick={onKillExternal} loading={loading} className="text-xs px-3 py-1.5">
                Kill external process
              </GlassButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {startFailure && !conflict ? (
        <div className="utility-panel-error">
          <div className="font-semibold">Dev server failed to start</div>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5">
            {startFailure.message}
          </pre>
          {startFailure.logPath ? (
            <div className="mt-2 text-xs opacity-80">
              <strong>Log:</strong>{' '}
              <code className="break-all">{startFailure.logPath}</code>
            </div>
          ) : null}
        </div>
      ) : null}

      {error && !conflict && !startFailure ? (
        <div className="utility-panel-error">{error}</div>
      ) : null}

      <div className="mb-3">
        <GlassInput
          label="Preferred Port"
          inputMode="numeric"
          value={preferredPort}
          onChange={event => onPreferredPortChange(event.target.value.replace(/[^\d]/g, ''))}
          placeholder="3001"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <GlassButton
          variant="secondary"
          onClick={onSavePreferredPort}
          loading={loading}
          className="text-xs px-3 py-1.5"
        >
          Save Port
        </GlassButton>
        {!isRunning ? (
          <GlassButton
            variant="primary"
            onClick={onStart}
            loading={loading}
            disabled={!task.worktree_path}
            className="text-xs px-3 py-1.5"
          >
            Start
          </GlassButton>
        ) : (
          <>
            <GlassButton variant="danger" onClick={onStop} loading={loading} className="text-xs px-3 py-1.5">
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

export function DevServerPanel({ task }: DevServerPanelProps) {
  const [isFetching, setIsFetching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const loading = isFetching || isPending
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ExternalPortConflict | null>(null)
  const [startFailure, setStartFailure] = useState<StartFailureDetails | null>(null)
  const router = useRouter()
  const [preferredPort, setPreferredPort] = useState(
    task.preferred_port != null ? String(task.preferred_port) : '',
  )

  const handleSavePreferredPort = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setConflict(null)
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
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [preferredPort, router, task.id])

  const handleStart = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setConflict(null)
    setStartFailure(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredPort: preferredPort.trim() ? Number(preferredPort) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.conflictType === 'external_port_in_use') {
          setConflict(data as ExternalPortConflict)
          return
        }
        if (res.status === 500 && typeof data.logPath === 'string') {
          setStartFailure({
            message: data.error ?? 'Dev server failed to start',
            logPath: data.logPath,
          })
          startTransition(() => router.refresh())
          return
        }
        throw new Error(data.error ?? 'Failed to start dev server')
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [preferredPort, router, task.id])

  const handleStop = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setConflict(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to stop dev server')
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [task.id, router])

  const handleKillExternal = useCallback(async () => {
    if (!conflict?.process?.pid) {
      return
    }

    setIsFetching(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/dev`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalPid: conflict.process.pid,
          externalPort: conflict.port,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to stop external process')
      }
      setConflict(null)
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [conflict, router, task.id])

  return (
    <DevServerPanelView
      task={task}
      loading={loading}
      error={error}
      startFailure={startFailure}
      preferredPort={preferredPort}
      conflict={conflict}
      onPreferredPortChange={value => {
        setPreferredPort(value)
        setConflict(null)
        setStartFailure(null)
      }}
      onSavePreferredPort={handleSavePreferredPort}
      onStart={handleStart}
      onStop={handleStop}
      onKillExternal={handleKillExternal}
    />
  )
}
