import { NextResponse } from 'next/server'
import { TaskRepository, AgentRunRepository, ReviewGateRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const agentRunRepo = new AgentRunRepository(db)
    const reviewGateRepo = new ReviewGateRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const reviewGates = reviewGateRepo.findByTaskId(taskId)
    const agentRuns = agentRunRepo.findByTaskId(taskId)
    const activeAgentRun = task.current_agent_run_id
      ? agentRunRepo.findById(task.current_agent_run_id)
      : null

    return NextResponse.json({
      ...task,
      reviewGates,
      agentRuns,
      activeAgentRun,
    })
  } catch (error) {
    console.error('GET /api/tasks/[taskId] failed:', error)
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
    const updated = taskRepo.update(taskId, body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
