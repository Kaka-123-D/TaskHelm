'use client'

import type { Task } from '@taskhelm/core'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DeleteConfirm } from '@/components/delete-confirm'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassModal } from '@/components/design-system/glass-modal'
import { PortBadge } from '@/components/design-system/port-badge'
import { getTaskPriorityLabel } from '@/lib/tasks/priority-label'

interface TaskRowProps {
  readonly task: Task
  readonly projectSlug: string
}

interface ExternalPortConflict {
  readonly conflictType: 'external_port_in_use'
  readonly port: number
  readonly process: {
    readonly pid: number | null
    readonly command: string | null
    readonly user: string | null
    readonly cwd: string | null
  } | null
}

export function TaskRow({ task, projectSlug }: TaskRowProps) {
  const router = useRouter()
  const [isFetching, setIsFetching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ExternalPortConflict | null>(null)
  const loading = isFetching || isPending
  const isRunning = task.dev_server_state === 'running' || task.dev_server_state === 'warm'
  const branchLabel = task.branch_name ?? task.workspace_branch ?? 'No branch'
  const worktreeLabel = task.workspace_name ?? 'No workspace'
  const portLabel =
    task.port != null ? `:${task.port}` : task.preferred_port != null ? `:${task.preferred_port}` : null

  const startServer = useCallback(async (): Promise<{ ok: boolean; conflict?: ExternalPortConflict }> => {
    const response = await fetch(`/api/tasks/${task.id}/dev`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferredPort: task.preferred_port,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok) {
      return { ok: true }
    }
    if (response.status === 409 && payload?.conflictType === 'external_port_in_use') {
      return { ok: false, conflict: payload as ExternalPortConflict }
    }
    throw new Error(payload?.error ?? 'Failed to start dev server')
  }, [task.id, task.preferred_port])

  const handleStart = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setConflict(null)
    try {
      const result = await startServer()
      if (result.conflict) {
        setConflict(result.conflict)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [router, startServer])

  const handleStop = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    try {
      const response = await fetch(`/api/tasks/${task.id}/dev`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error ?? 'Failed to stop dev server')
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [router, task.id])

  const handleKillAndStart = useCallback(async () => {
    if (!conflict?.process?.pid) return
    setIsFetching(true)
    setError(null)
    try {
      const killRes = await fetch(`/api/tasks/${task.id}/dev`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalPid: conflict.process.pid,
          externalPort: conflict.port,
        }),
      })
      const killData = await killRes.json().catch(() => ({}))
      if (!killRes.ok) {
        throw new Error(killData?.error ?? 'Failed to stop external process')
      }
      const result = await startServer()
      if (result.conflict) {
        setConflict(result.conflict)
        return
      }
      setConflict(null)
      startTransition(() => router.refresh())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [conflict, router, startServer, task.id])

  const handleDelete = useCallback(async () => {
    const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json()
      throw new Error(payload.error ?? 'Failed to delete task')
    }
    router.refresh()
  }, [router, task.id])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="task-row-surface flex flex-wrap items-center gap-3 transition-colors">
        <Link href={`/projects/${projectSlug}/tasks/${task.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {task.title}
            </div>
            {task.goal && <p className="task-row-goal line-clamp-2">{task.goal}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="task-row-meta-pill">{getTaskPriorityLabel(task.priority)}</span>
              <span className="task-row-meta-pill">{worktreeLabel}</span>
              <span className="task-row-meta-pill">{branchLabel}</span>
              {portLabel ? <span className="task-row-meta-pill">{portLabel}</span> : null}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {task.port != null && <PortBadge port={task.port} />}
          </div>
          </div>
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
            <GlassButton variant="danger" onClick={handleStop} loading={loading} className="text-xs px-3 py-1.5">
              Stop
            </GlassButton>
          )}
          <DeleteConfirm
            label="Delete"
            confirmText={`Delete task "${task.title}"? This cannot be undone.`}
            onConfirm={handleDelete}
          />
        </div>
        {error ? <div className="basis-full text-xs text-[var(--danger)]">{error}</div> : null}
      </div>

      <GlassModal
        open={conflict !== null}
        onClose={() => {
          if (!loading) setConflict(null)
        }}
        title={`Port ${conflict?.port ?? ''} đang bị chiếm`}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Một process khác đang nghe trên port này. Process nằm ngoài TaskHelm — kiểm tra trước khi quyết định kill.
          </p>
          <dl className="space-y-2 text-xs leading-5 text-[var(--text-primary)]">
            {conflict?.process?.pid != null ? (
              <div className="flex gap-2">
                <dt className="w-20 font-semibold text-[var(--text-muted)]">PID</dt>
                <dd className="font-mono">{conflict.process.pid}</dd>
              </div>
            ) : null}
            {conflict?.process?.command ? (
              <div className="flex gap-2">
                <dt className="w-20 font-semibold text-[var(--text-muted)]">Command</dt>
                <dd className="font-mono break-all">{conflict.process.command}</dd>
              </div>
            ) : null}
            {conflict?.process?.user ? (
              <div className="flex gap-2">
                <dt className="w-20 font-semibold text-[var(--text-muted)]">User</dt>
                <dd className="font-mono">{conflict.process.user}</dd>
              </div>
            ) : null}
            {conflict?.process?.cwd ? (
              <div className="flex gap-2">
                <dt className="w-20 font-semibold text-[var(--text-muted)]">CWD</dt>
                <dd className="font-mono break-all">{conflict.process.cwd}</dd>
              </div>
            ) : null}
          </dl>
          {error ? <div className="text-xs text-[var(--danger)]">{error}</div> : null}
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="secondary"
              onClick={() => setConflict(null)}
              disabled={loading}
              className="text-xs px-3 py-1.5"
            >
              Huỷ
            </GlassButton>
            <GlassButton
              variant="danger"
              onClick={handleKillAndStart}
              loading={loading}
              disabled={!conflict?.process?.pid}
              className="text-xs px-3 py-1.5"
            >
              Kill & Start
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </motion.div>
  )
}
