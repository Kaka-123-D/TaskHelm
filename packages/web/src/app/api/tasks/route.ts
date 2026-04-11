import { NextResponse } from 'next/server'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId query parameter is required' }, { status: 400 })
    }

    const db = getDb()
    const taskRepo = new TaskRepository(db)
    let tasks = taskRepo.findByProjectId(projectId)

    if (status) {
      tasks = tasks.filter(t => t.status === status)
    }

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks failed:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb()
    const repo = new TaskRepository(db)
    const body = await request.json()

    const task = repo.create(body)
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
