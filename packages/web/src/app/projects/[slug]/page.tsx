import { notFound } from 'next/navigation'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { TaskList } from '@/components/task-list'
import { CreateTaskForm } from '@/components/create-task-form'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { PageTransition } from '@/components/page-transition'
import { EditProjectForm } from '@/components/edit-project-form'

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)

  const project = projectRepo.findBySlug(slug)
  if (!project) notFound()

  const tasks = taskRepo.findByProjectId(project.id)
  const runningCount = tasks.filter(task => task.status === 'running').length
  const readyCount = tasks.filter(task => task.status === 'ready').length

  return (
    <PageTransition>
      <div className="workbench-page-shell">
        <Breadcrumb segments={[
          { label: 'Projects', href: '/' },
          { label: project.name },
        ]} />

        <section className="workbench-hero">
          <div className="workbench-hero-header">
            <div>
              <span className="workbench-hero-eyebrow">Project Workspace</span>
              <h1 className="workbench-hero-title">{project.name}</h1>
              <p className="workbench-hero-description">
                {project.description || 'This project is ready for task planning, workspace setup, and dev server workflows.'}
              </p>
            </div>
            <div className="workbench-hero-actions">
              <EditProjectForm project={project} />
              <CreateTaskForm projectId={project.id} />
            </div>
          </div>

          <div className="workbench-meta-grid">
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Repo root</div>
              <div className="workbench-meta-value" data-mono="true">
                {project.local_repo_root}
              </div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Tasks</div>
              <div className="workbench-meta-value">{tasks.length}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Running</div>
              <div className="workbench-meta-value">{runningCount}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Ready</div>
              <div className="workbench-meta-value">{readyCount}</div>
            </div>
          </div>
        </section>

        <section className="workbench-section-shell">
          <div className="workbench-section-header">
            <div>
              <div className="workbench-section-title">Task Rail</div>
              <p className="workbench-section-copy">Filter active work, inspect status quickly, and jump directly into task execution.</p>
            </div>
          </div>
          <TaskList tasks={tasks} projectSlug={slug} />
        </section>
      </div>
    </PageTransition>
  )
}
