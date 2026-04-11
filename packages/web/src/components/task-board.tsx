import type { Task } from '@taskhelm/core'
import { TaskRow } from '@/components/task-row'

interface TaskBoardProps {
  tasks: readonly Task[]
  projectSlug: string
}

export function TaskBoard({ tasks, projectSlug }: TaskBoardProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-lg mb-2">No tasks yet</p>
        <p className="text-sm">Use the CLI to create a task:</p>
        <code className="mt-2 inline-block bg-zinc-900 px-3 py-1 rounded text-sm font-mono">
          taskhelm task create --project {projectSlug} --title &quot;My Task&quot;
        </code>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-zinc-700 text-left">
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-20">ID</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-28">Status</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-36">Phase</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-40">Branch</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-16">Port</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-28">Dev Server</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-16">Priority</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Blocker</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} projectSlug={projectSlug} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
