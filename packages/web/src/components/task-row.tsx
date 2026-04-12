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
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--glass-radius-sm)] border transition-colors hover:bg-[var(--surface-hover)]"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <StatusDot status={task.status} />
          <span
            className={`text-sm flex-1 ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
          >
            {task.title}
          </span>
          <StatusBadge value={task.status} />
          {task.port != null && <PortBadge port={task.port} />}
        </div>
      </Link>
    </motion.div>
  )
}
