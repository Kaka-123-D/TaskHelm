import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getPoolStatus } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { StatusBadge } from '@/components/status-badge'

export default function DevPoolPage() {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)
  const projects = projectRepo.findAll()

  const pool = projects.flatMap(project => {
    const { servers } = getPoolStatus(db, project.id)
    return servers.map(server => {
      const task = server.task_id ? taskRepo.findById(server.task_id) : null
      return {
        projectSlug: project.slug,
        projectName: project.name,
        taskId: server.task_id,
        taskTitle: task?.title ?? null,
        port: server.port,
        pid: server.pid,
        status: server.status,
        startedAt: server.started_at,
      }
    })
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Dev Server Pool</h2>
        <span className="text-sm text-zinc-500">{pool.length} server(s)</span>
      </div>

      {pool.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-2">No dev servers running</p>
          <p className="text-sm">Start a dev server from a task&apos;s cockpit page.</p>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-700 text-left">
                <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Project</th>
                <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Task</th>
                <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-20">Port</th>
                <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-20">PID</th>
                <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Started</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((s, i) => (
                <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
                  <td className="px-3 py-2">
                    <a href={`/projects/${s.projectSlug}`} className="text-blue-400 hover:text-blue-300">
                      {s.projectName}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    {s.taskId ? (
                      <a
                        href={`/projects/${s.projectSlug}/tasks/${s.taskId}`}
                        className="text-zinc-300 hover:text-zinc-100"
                      >
                        {s.taskTitle ?? s.taskId}
                      </a>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{s.port}</td>
                  <td className="px-3 py-2 font-mono text-zinc-400">{s.pid ?? '-'}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={s.status} />
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-zinc-500">
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
