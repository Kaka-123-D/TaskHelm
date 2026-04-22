import { notFound } from 'next/navigation'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { Breadcrumb } from '@/components/design-system/breadcrumb'
import { PortBadge } from '@/components/design-system/port-badge'
import { TaskDetailPanels } from '@/components/task-detail-panels'
import { EditTaskForm } from '@/components/edit-task-form'
import { DeleteConfirm } from '@/components/delete-confirm'
import { PageTransition } from '@/components/page-transition'
import { getTaskPriorityLabel } from '@/lib/tasks/priority-label'

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
  const worktreeName =
    task.workspace_name ??
    task.worktree_path?.split(/[/\\\\]/).filter(Boolean).at(-1) ??
    'Not initialized'
  const branchLabel = task.branch_name ?? task.workspace_branch ?? 'Not initialized'
  const portLabel =
    task.port != null
      ? `:${task.port}`
      : task.preferred_port != null
        ? `:${task.preferred_port} saved`
        : 'Not assigned'

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
              {task.refer_link ? (
                <div className="mt-3">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Refer Link
                  </div>
                  <a
                    href={task.refer_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)] underline decoration-[rgba(176,110,24,0.35)] underline-offset-4 transition hover:text-[var(--accent-hover)]"
                  >
                    {task.refer_link}
                  </a>
                </div>
              ) : null}
            </div>
            <div className="workbench-hero-actions">
              {task.port != null && <PortBadge port={task.port} />}
              <EditTaskForm task={task} projectSlug={slug} />
              <DeleteConfirm
                label="Delete"
                confirmText={`Delete task "${task.title}"? This cannot be undone.`}
                onConfirm={handleDelete}
                redirectHref={`/projects/${slug}`}
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
              <div className="workbench-meta-value">{getTaskPriorityLabel(task.priority)}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Branch</div>
              <div className="workbench-meta-value">{branchLabel}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Worktree</div>
              <div className="workbench-meta-value">{worktreeName}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Port</div>
              <div className="workbench-meta-value">{portLabel}</div>
            </div>
            <div className="workbench-meta-card">
              <div className="workbench-meta-label">Dev state</div>
              <div className="workbench-meta-value">{task.dev_server_state || 'stopped'}</div>
            </div>
          </div>
        </section>

        <div className="task-detail-section">
          <TaskDetailPanels
            task={task}
            project={project}
          />
        </div>
      </div>
    </PageTransition>
  )
}
