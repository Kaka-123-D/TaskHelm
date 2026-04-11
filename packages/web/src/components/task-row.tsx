import type { Task } from '@taskhelm/core'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'

interface TaskRowProps {
  task: Task
  projectSlug: string
}

export function TaskRow({ task, projectSlug }: TaskRowProps) {
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-900/40 transition-colors">
      <td className="px-3 py-2.5">
        <Link
          href={`/projects/${projectSlug}/tasks/${task.id}`}
          className="font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {task.id.slice(0, 8)}
        </Link>
      </td>
      <td className="px-3 py-2.5 max-w-[240px]">
        <Link
          href={`/projects/${projectSlug}/tasks/${task.id}`}
          className="text-sm font-medium text-zinc-100 hover:text-white transition-colors line-clamp-1"
        >
          {task.title}
        </Link>
        {task.key && (
          <span className="text-xs text-zinc-500 font-mono ml-1">[{task.key}]</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge value={task.status} variant="status" />
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge value={task.phase} variant="phase" />
      </td>
      <td className="px-3 py-2.5">
        {task.branch_name ? (
          <span className="font-mono text-xs text-zinc-300 truncate max-w-[140px] block">
            {task.branch_name}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {task.port != null ? (
          <span className="font-mono text-xs text-zinc-300">{task.port}</span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {task.dev_server_state ? (
          <StatusBadge value={task.dev_server_state} />
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-zinc-500 font-mono">
        {task.priority}
      </td>
      <td className="px-3 py-2.5">
        {task.latest_blocker ? (
          <span className="text-xs text-red-400 line-clamp-1 max-w-[160px] block" title={task.latest_blocker}>
            {task.latest_blocker}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>
    </tr>
  )
}
