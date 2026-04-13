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
      <div className="workbench-page-shell">
        <Breadcrumb segments={[
          { label: 'Projects', href: '/' },
          { label: project.name, href: `/projects/${slug}` },
          { label: task.title },
        ]} />

        <section className="workbench-hero">
          <div className="workbench-hero-header">
            <div>
              <span className="workbench-hero-eyebrow">Task Work Item</span>
              <h1 className="workbench-hero-title">{task.title}</h1>
              <p className="workbench-hero-description">
                {task.goal || `Working inside ${project.name}. Use the right-hand utilities to manage workspace and dev runtime.`}
              </p>
            </div>
            <div className="workbench-hero-actions">
              <StatusBadge value={task.status} />
              {task.port != null && <PortBadge port={task.port} />}
              <EditTaskForm task={task} projectSlug={slug} />
              <DeleteConfirm
                label="Delete"
                confirmText={`Delete task "${task.title}"? This cannot be undone.`}
                onConfirm={handleDelete}
              />
            </div>
          </div>

          <div className="workbench-meta-grid">
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Project</div>
              <div className="workbench-meta-value">{project.name}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Priority</div>
              <div className="workbench-meta-value">{task.priority}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Workspace</div>
              <div className="workbench-meta-value">{task.worktree_path ? 'Ready' : 'Not initialized'}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Dev state</div>
              <div className="workbench-meta-value">{task.dev_server_state || 'stopped'}</div>
            </div>
          </div>
        </section>

        <section className="workbench-section-shell">
          <div className="workbench-section-header">
            <div>
              <div className="workbench-section-title">Execution Surface</div>
              <p className="workbench-section-copy">Read context, preview artifacts, and manage workspace/runtime from one workbench.</p>
            </div>
          </div>
          <TaskDetailPanels task={task} project={project} />
        </section>
      </div>
    </PageTransition>
  )
}
