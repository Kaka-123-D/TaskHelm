import { NextResponse } from 'next/server'
import { TaskRepository, AgentRunRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

const VALID_KINDS = ['implementer', 'spec_review', 'code_review', 'runtime_verify'] as const

/** POST = dispatch an agent run */
export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()
    const kind = body.kind as string

    if (!VALID_KINDS.includes(kind as typeof VALID_KINDS[number])) {
      return NextResponse.json(
        { error: `Invalid kind "${kind}". Must be one of: ${VALID_KINDS.join(', ')}` },
        { status: 400 }
      )
    }

    const agentRunRepo = new AgentRunRepository(db)
    const run = agentRunRepo.create({ task_id: task.id, kind })
    agentRunRepo.start(run.id)

    return NextResponse.json(run, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
