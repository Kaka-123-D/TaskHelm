'use client'

import type { Task } from '@taskhelm/core'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeleteConfirm } from '@/components/delete-confirm'
import { GlassButton } from '@/components/design-system/glass-button'
import { PortBadge } from '@/components/design-system/port-badge'
import { getTaskPriorityLabel } from '@/lib/tasks/priority-label'

interface TaskRowProps {
  readonly task: Task
  readonly projectSlug: string
}

export function TaskRow({ task, projectSlug }: TaskRowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isRunning = task.dev_server_state === 'running' || task.dev_server_state === 'warm'
  const branchLabel = task.branch_name ?? task.workspace_branch ?? 'No branch'
  const worktreeLabel = task.workspace_name ?? 'No workspace'
  const portLabel =
    task.port != null ? `:${task.port}` : task.preferred_port != null ? `:${task.preferred_port}` : null

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/tasks/${task.id}/dev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredPort: task.preferred_port,
        }),
      })
      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error ?? 'Failed to start dev server')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [router, task.id, task.preferred_port])

  const handleStop = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/tasks/${task.id}/dev`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error ?? 'Failed to stop dev server')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [router, task.id])

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
    </motion.div>
  )
}
