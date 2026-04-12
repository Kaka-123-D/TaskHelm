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
      <Breadcrumb segments={[
        { label: 'Projects', href: '/' },
        { label: project.name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{project.description}</p>
          )}
          <div className="font-mono text-xs text-[var(--text-muted)] mt-1">{project.local_repo_root}</div>
        </div>
        <div className="flex items-center gap-2">
          <EditProjectForm project={project} />
          <CreateTaskForm projectId={project.id} />
        </div>
      </div>

      {/* Task List */}
      <TaskList tasks={tasks} projectSlug={slug} />
    </PageTransition>
  )
}
