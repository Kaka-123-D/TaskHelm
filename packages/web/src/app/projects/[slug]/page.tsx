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
              <CreateTaskForm projectId={project.id} isMultiRepo={project.is_multi_repo} />
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
              <div className="workbench-meta-label">Workspaces</div>
              <div className="workbench-meta-value">{tasks.filter(task => task.worktree_path).length}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Dev ports</div>
              <div className="workbench-meta-value">{tasks.filter(task => task.port != null).length}</div>
            </div>
          </div>
        </section>

        <section className="workbench-section-shell">
          <div className="workbench-section-header">
            <div>
              <div className="workbench-section-title">Task Rail</div>
              <p className="workbench-section-copy">Browse task priorities, runtime metadata, and jump directly into task execution.</p>
            </div>
          </div>
          <TaskList tasks={tasks} projectSlug={slug} />
        </section>
      </div>
    </PageTransition>
  )
}
