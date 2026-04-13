'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import type { Task } from '@taskhelm/core'
import { FilterPills } from '@/components/design-system/filter-pills'
import { TaskRow } from '@/components/task-row'

interface TaskListProps {
  readonly tasks: readonly Task[]
  readonly projectSlug: string
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'running', label: 'Running' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

export function TaskList({ tasks, projectSlug }: TaskListProps) {
  const [filter, setFilter] = useState('all')

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter)

  const filterOptions = STATUS_FILTERS.map(f => ({
    ...f,
    count: f.value === 'all' ? tasks.length : tasks.filter(t => t.status === f.value).length,
  }))

  return (
    <div className="task-list-shell">
      <div className="task-list-toolbar">
        <FilterPills options={filterOptions} value={filter} onChange={setFilter} />
        <span className="text-sm text-[var(--text-secondary)]">
          {filteredTasks.length} visible {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="task-list-empty">
          <p className="text-sm text-[var(--text-muted)]">
            {filter === 'all' ? 'No tasks yet. Create your first task!' : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map(task => (
              <TaskRow key={task.id} task={task} projectSlug={projectSlug} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
