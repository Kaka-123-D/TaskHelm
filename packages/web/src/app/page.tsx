import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { ProjectCard } from '@/components/project-card'

export default function HomePage() {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)
  const projects = projectRepo.findAll()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Projects</h2>
        <span className="text-sm text-zinc-500">{projects.length} project(s)</span>
      </div>
      {projects.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg mb-2">No projects yet</p>
          <p className="text-sm">Use the CLI to create a project:</p>
          <code className="mt-2 inline-block bg-zinc-900 px-3 py-1 rounded text-sm font-mono">
            taskhelm project create --name &quot;My Project&quot; --slug my-project --repo /path/to/repo
          </code>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const tasks = taskRepo.findByProjectId(project.id)
            const activeTasks = tasks.filter(t => t.status === 'running')
            const blockedTasks = tasks.filter(t => t.status === 'blocked')
            return (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={tasks.length}
                activeCount={activeTasks.length}
                blockedCount={blockedTasks.length}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
