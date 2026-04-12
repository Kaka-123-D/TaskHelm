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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Projects</h2>
          <span className="text-sm text-[var(--text-muted)]">{projects.length} project(s)</span>
        </div>
        <CreateProjectForm />
      </div>
      <ProjectList projects={projectsWithCounts} />
    </PageTransition>
  )
}
