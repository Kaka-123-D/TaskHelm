import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { ProjectList } from '@/components/project-list'
import { CreateProjectForm } from '@/components/create-project-form'
import { PageTransition } from '@/components/page-transition'

export default function HomePage() {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)
  const projects = projectRepo.findAll()

  const projectsWithCounts = projects.map(project => {
    const tasks = taskRepo.findByProjectId(project.id)
    return {
      project,
      taskCount: tasks.length,
      runningCount: tasks.filter(t => t.status === 'running').length,
    }
  })

  return (
    <PageTransition>
      <div data-slot="projects-page-shell" className="projects-page-shell">
        <div className="projects-page-header">
          <div>
            <span className="projects-page-eyebrow">Workspace view</span>
            <h1>Projects</h1>
            <p className="projects-page-description">
              Track your local repos, jump into active work, and keep every engineering workspace in one bright control room.
            </p>
          </div>
          <div className="projects-page-actions">
            <div className="projects-page-stat">
              <span className="projects-page-stat-label">Tracked repos</span>
              <span className="projects-page-stat-value">{projects.length}</span>
            </div>
            <CreateProjectForm />
          </div>
        </div>

        <div className="projects-page-toolbar">
          <p className="projects-page-toolbar-copy">
            Card grid manager with workspace shell styling inspired by PostHog, adapted for TaskHelm.
          </p>
          <span className="projects-page-toolbar-badge">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        <ProjectList projects={projectsWithCounts} />
      </div>
    </PageTransition>
  )
}
