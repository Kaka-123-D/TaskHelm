'use client'

import type { Task } from '@taskhelm/core'
import Link from 'next/link'
import { motion } from 'motion/react'
import { StatusDot } from '@/components/design-system/status-dot'
import { StatusBadge } from '@/components/status-badge'
import { PortBadge } from '@/components/design-system/port-badge'

interface TaskRowProps {
  readonly task: Task
  readonly projectSlug: string
}

export function TaskRow({ task, projectSlug }: TaskRowProps) {
  const isDone = task.status === 'done' || task.status === 'archived'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/projects/${projectSlug}/tasks/${task.id}`}>
        <div className="task-row-surface flex flex-wrap items-start gap-3 transition-colors">
          <StatusDot status={task.status} />
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-semibold ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {task.title}
            </div>
            {task.goal && <p className="task-row-goal line-clamp-2">{task.goal}</p>}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusBadge value={task.status} />
            {task.port != null && <PortBadge port={task.port} />}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
