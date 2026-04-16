import { NextResponse } from 'next/server'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

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

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()
    const refer_link =
      Object.prototype.hasOwnProperty.call(body, 'refer_link')
        ? normalizeReferLink(body.refer_link)
        : undefined

    const updated = taskRepo.update(taskId, {
      ...body,
      ...(refer_link !== undefined ? { refer_link } : {}),
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    taskRepo.delete(taskId)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
