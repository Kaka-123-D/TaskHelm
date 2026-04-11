import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const projectRepo = new ProjectRepository(db)
    const taskRepo = new TaskRepository(db)
    const projects = projectRepo.findAll()

    const result = projects.map(p => ({
      ...p,
      taskCount: taskRepo.findByProjectId(p.id).length,
      activeTaskCount: taskRepo.findByProjectId(p.id).filter(t => t.status === 'running').length,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/projects failed:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb()
    const repo = new ProjectRepository(db)
    const body = await request.json()

    const project = repo.create(body)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
