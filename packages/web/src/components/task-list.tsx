'use client'

import { AnimatePresence } from 'motion/react'
import type { Task } from '@taskhelm/core'
import { TaskRow } from '@/components/task-row'

interface TaskListProps {
  readonly tasks: readonly Task[]
  readonly projectSlug: string
}

export function TaskList({ tasks, projectSlug }: TaskListProps) {
  return (
    <div className="task-list-shell">
      {tasks.length === 0 ? (
        <div className="task-list-empty">
          <p className="text-sm text-[var(--text-muted)]">
            No tasks yet. Create your first task!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} projectSlug={projectSlug} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
