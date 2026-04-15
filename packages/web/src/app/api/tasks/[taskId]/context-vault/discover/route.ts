import { NextResponse } from 'next/server'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { discoverMarkdownFiles } from '@/lib/context-vault/markdown-vault'

type Params = { params: Promise<{ taskId: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const task = new TaskRepository(getDb()).findById(taskId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = (await request.json()) as { path?: string }
    if (!body.path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    return NextResponse.json(discoverMarkdownFiles(body.path))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
