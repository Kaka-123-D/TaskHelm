import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getPoolStatus } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { StatusBadge } from '@/components/status-badge'
import { PortBadge } from '@/components/design-system/port-badge'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { PageTransition } from '@/components/page-transition'

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
    <PageTransition>
      <Breadcrumb segments={[{ label: 'Dev Servers' }]} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Dev Server Pool</h2>
        <span className="text-sm text-[var(--text-muted)]">{pool.length} server(s)</span>
      </div>

      {pool.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2 text-[var(--text-secondary)]">No dev servers running</p>
          <p className="text-sm text-[var(--text-muted)]">Start a dev server from a task&apos;s detail page.</p>
        </div>
      ) : (
        <div
          className="rounded-[var(--glass-radius)] border overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-20" style={{ color: 'var(--text-muted)' }}>Port</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-20" style={{ color: 'var(--text-muted)' }}>PID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-24" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Started</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((s, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="px-4 py-3">
                    <a href={`/projects/${s.projectSlug}`} className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                      {s.projectName}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {s.taskId ? (
                      <a
                        href={`/projects/${s.projectSlug}/tasks/${s.taskId}`}
                        className="text-[var(--text-primary)] hover:text-white transition-colors"
                      >
                        {s.taskTitle ?? s.taskId}
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><PortBadge port={s.port} /></td>
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{s.pid ?? '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                  <td className="px-4 py-3 text-xs font-mono text-[var(--text-muted)]">
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageTransition>
  )
}
