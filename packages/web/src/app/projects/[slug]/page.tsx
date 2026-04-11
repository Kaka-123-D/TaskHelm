import { notFound } from 'next/navigation'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { TaskBoard } from '@/components/task-board'
import { StatusBadge } from '@/components/status-badge'
import { CreateTaskForm } from '@/components/create-task-form'
import { ProjectActions } from '@/components/project-actions'

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
  const runningCount = tasks.filter(t => t.status === 'running').length
  const blockedCount = tasks.filter(t => t.status === 'blocked').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  return (
    <div>
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-zinc-400 mb-2">{project.description}</p>
            )}
            <div className="font-mono text-xs text-zinc-500">{project.local_repo_root}</div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge value={project.specdown_mode} />
            <ProjectActions project={project} />
          </div>
        </div>

        {/* Project Meta */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-400">
          {project.default_branch && (
            <span>
              Branch: <span className="font-mono text-zinc-300">{project.default_branch}</span>
            </span>
          )}
          {project.dev_command && (
            <span>
              Dev: <span className="font-mono text-zinc-300">{project.dev_command}</span>
            </span>
          )}
          {project.test_command && (
            <span>
              Test: <span className="font-mono text-zinc-300">{project.test_command}</span>
            </span>
          )}
          <span>Max Dev Servers: <span className="text-zinc-300">{project.max_active_dev_servers}</span></span>
        </div>

        {/* Task Stats */}
        <div className="mt-4 flex gap-4 text-sm">
          <span className="text-zinc-400">{tasks.length} total tasks</span>
          {runningCount > 0 && <span className="text-green-400">{runningCount} running</span>}
          {blockedCount > 0 && <span className="text-red-400">{blockedCount} blocked</span>}
          {doneCount > 0 && <span className="text-emerald-400">{doneCount} done</span>}
        </div>
      </div>

      {/* Task Board */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Tasks</h3>
          <CreateTaskForm projectId={project.id} />
        </div>
        <TaskBoard tasks={tasks} projectSlug={slug} />
      </div>
    </div>
  )
}
