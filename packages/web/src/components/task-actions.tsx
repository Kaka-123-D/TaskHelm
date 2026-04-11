'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { EditTaskForm } from '@/components/edit-task-form'
import { DeleteConfirm } from '@/components/delete-confirm'
import { TaskStatusSelect } from '@/components/task-status-select'

interface TaskActionsProps {
  readonly task: Task
  readonly projectSlug: string
}

export function TaskActions({ task, projectSlug }: TaskActionsProps) {
  const router = useRouter()

  const handleDelete = useCallback(async () => {
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to delete task')
    }
    router.push(`/projects/${projectSlug}`)
    router.refresh()
  }, [task.id, projectSlug, router])

  return (
    <div className="flex items-center gap-2">
      <TaskStatusSelect taskId={task.id} currentStatus={task.status} />
      <EditTaskForm task={task} />
      <DeleteConfirm
        label="Delete"
        confirmText={`Delete task "${task.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
