import { notFound } from 'next/navigation'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { StatusBadge } from '@/components/status-badge'
import { PortBadge } from '@/components/design-system/port-badge'
import { TaskDetailPanels } from '@/components/task-detail-panels'
import { EditTaskForm } from '@/components/edit-task-form'
import { DeleteConfirm } from '@/components/delete-confirm'
import { PageTransition } from '@/components/page-transition'

interface TaskPageProps {
  params: Promise<{ slug: string; taskId: string }>
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { slug, taskId } = await params
  const db = getDb()

  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)

  const project = projectRepo.findBySlug(slug)
  if (!project) notFound()

  const task = taskRepo.findById(taskId)
  if (!task || task.project_id !== project.id) notFound()

  const resolvedTaskId = task.id

  async function handleDelete() {
    'use server'
    const db2 = getDb()
    new TaskRepository(db2).delete(resolvedTaskId)
  }

  return (
    <PageTransition>
      <Breadcrumb segments={[
        { label: 'Projects', href: '/' },
        { label: project.name, href: `/projects/${slug}` },
        { label: task.title },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{task.title}</h2>
          <StatusBadge value={task.status} />
          {task.port != null && <PortBadge port={task.port} />}
        </div>
        <div className="flex items-center gap-2">
          <EditTaskForm task={task} />
          <DeleteConfirm
            label="Delete"
            confirmText={`Delete task "${task.title}"? This cannot be undone.`}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {/* Split Panels */}
      <TaskDetailPanels task={task} project={project} />
    </PageTransition>
  )
}
