import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params
    const db = getDb()
    const projectRepo = new ProjectRepository(db)
    const taskRepo = new TaskRepository(db)

    const project = projectRepo.findBySlug(slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const tasks = taskRepo.findByProjectId(project.id)
    const result = {
      ...project,
      taskCount: tasks.length,
      activeTaskCount: tasks.filter(t => t.status === 'running').length,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/projects/[slug] failed:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { slug } = await params
    const db = getDb()
    const projectRepo = new ProjectRepository(db)

    const project = projectRepo.findBySlug(slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const updated = projectRepo.update(project.id, body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
