import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ProjectRepository,
  TaskRepository,
  AgentRunRepository,
  ReviewGateRepository,
  EventRepository,
} from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { TaskCockpit } from '@/components/task-cockpit'

interface TaskPageProps {
  params: Promise<{ slug: string; taskId: string }>
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { slug, taskId } = await params
  const db = getDb()

  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)
  const agentRunRepo = new AgentRunRepository(db)
  const reviewGateRepo = new ReviewGateRepository(db)
  const eventRepo = new EventRepository(db)

  const project = projectRepo.findBySlug(slug)
  if (!project) notFound()

  const task = taskRepo.findById(taskId)
  if (!task || task.project_id !== project.id) notFound()

  const agentRuns = agentRunRepo.findByTaskId(taskId)
  const reviewGates = reviewGateRepo.findByTaskId(taskId)
  const recentEvents = eventRepo.findByEntity('task', taskId)

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          Projects
        </Link>
        <span>/</span>
        <Link href={`/projects/${slug}`} className="hover:text-zinc-300 transition-colors">
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-300">{task.title}</span>
      </nav>

      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">{task.title}</h2>
        {task.key && (
          <span className="text-sm text-zinc-500 font-mono mt-1 inline-block">{task.key}</span>
        )}
      </div>

      {/* Cockpit */}
      <TaskCockpit
        task={task}
        agentRuns={agentRuns}
        reviewGates={reviewGates}
        recentEvents={recentEvents}
      />
    </div>
  )
}
