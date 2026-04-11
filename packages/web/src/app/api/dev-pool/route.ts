import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getPoolStatus } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectSlug = searchParams.get('project')

    const db = getDb()
    const projectRepo = new ProjectRepository(db)
    const taskRepo = new TaskRepository(db)

    let projects = projectRepo.findAll()
    if (projectSlug) {
      const project = projectRepo.findBySlug(projectSlug)
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      projects = [project]
    }

    const pool = projects.flatMap(project => {
      const { servers } = getPoolStatus(db, project.id)
      return servers.map(server => {
        const task = server.task_id ? taskRepo.findById(server.task_id) : null
        return {
          projectSlug: project.slug,
          projectName: project.name,
          taskId: server.task_id,
          taskTitle: task?.title ?? null,
          port: server.port,
          pid: server.pid,
          status: server.status,
          startedAt: server.started_at,
        }
      })
    })

    return NextResponse.json(pool)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
