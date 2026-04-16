import { NextResponse } from 'next/server'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

function normalizeReferLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  try {
    return new URL(value).toString()
  } catch {
    throw new Error('Refer link must be a valid absolute URL')
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId query parameter is required' }, { status: 400 })
    }

    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const tasks = taskRepo.findByProjectId(projectId)

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
    const refer_link = normalizeReferLink(body.refer_link)

    const task = repo.create({
      ...body,
      refer_link,
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
