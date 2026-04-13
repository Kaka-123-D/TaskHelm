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
      <div className="workbench-page-shell">
        <Breadcrumb segments={[{ label: 'Dev Servers' }]} />

        <section className="workbench-hero">
          <div className="workbench-hero-header">
            <div>
              <span className="workbench-hero-eyebrow">Operations View</span>
              <h1 className="workbench-hero-title">Dev Server Pool</h1>
              <p className="workbench-hero-description">
                Monitor active local runtimes across projects and jump directly into the work item that owns each process.
              </p>
            </div>
            <div className="workbench-hero-actions">
              <div className="projects-page-stat">
                <span className="projects-page-stat-label">Active servers</span>
                <span className="projects-page-stat-value">{pool.length}</span>
              </div>
            </div>
          </div>
        </section>

        {pool.length === 0 ? (
          <div className="workbench-section-shell">
            <div className="task-list-empty">
              <p className="mb-2 text-lg font-semibold text-[var(--text-primary)]">No dev servers running</p>
              <p className="text-sm text-[var(--text-secondary)]">Start a dev server from a task detail page to populate this pool.</p>
            </div>
          </div>
        ) : (
          <div className="workbench-section-shell">
            <div className="workbench-section-header">
              <div>
                <div className="workbench-section-title">Runtime Inventory</div>
                <p className="workbench-section-copy">Current processes, ports, and task ownership across all tracked projects.</p>
              </div>
            </div>
            <div className="dev-pool-table-shell">
              <table className="dev-pool-table w-full border-collapse text-sm">
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
                    <tr key={i} className="transition-colors">
                      <td className="px-4 py-3">
                        <a href={`/projects/${s.projectSlug}`} className="font-semibold text-[var(--accent-ink)] transition-colors hover:text-[var(--accent)]">
                          {s.projectName}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {s.taskId ? (
                          <a
                            href={`/projects/${s.projectSlug}/tasks/${s.taskId}`}
                            className="text-[var(--text-primary)] transition-colors hover:text-[var(--accent-ink)]"
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
          </div>
        )}
      </div>
    </PageTransition>
  )
}
