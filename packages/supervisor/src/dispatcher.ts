import type Database from 'better-sqlite3'
import { AgentRunRepository, TaskRepository, EventRepository, LockRepository } from '@taskhelm/core'
import type { ScheduledJob } from './scheduler.js'

const DISPATCH_LOCK_TTL_SECONDS = 60

/**
 * Executes a scheduled job by:
 * 1. Acquiring a dispatch lock for the task (prevents double-dispatch)
 * 2. Creating an AgentRun record (status=pending)
 * 3. Updating the task's current_agent_run_id
 * 4. Emitting an agent.run.started event
 * 5. Marking the agent run as running (status=running, started_at set)
 * 6. Releasing the dispatch lock
 *
 * If the lock cannot be acquired, the dispatch is skipped silently.
 */
export function dispatchJob(db: Database.Database, job: ScheduledJob): void {
  const lockRepo = new LockRepository(db)
  const lockKey = `task:${job.taskId}:dispatch`
  const lockOwner = `supervisor-${process.pid}`

  const acquired = lockRepo.acquire(lockKey, lockOwner, DISPATCH_LOCK_TTL_SECONDS)
  if (!acquired) {
    return
  }

  try {
    const agentRunRepo = new AgentRunRepository(db)
    const taskRepo = new TaskRepository(db)
    const eventRepo = new EventRepository(db)

    // 1. Create the agent run record (status=pending)
    const agentRun = agentRunRepo.create({
      task_id: job.taskId,
      kind: job.kind,
    })

    // 2. Update task's current_agent_run_id
    taskRepo.update(job.taskId, { current_agent_run_id: agentRun.id })

    // 3. Emit event
    eventRepo.append({
      entity_type: 'task',
      entity_id: job.taskId,
      event_type: 'agent.run.started',
      payload_json: JSON.stringify({ agent_run_id: agentRun.id, kind: job.kind }),
    })

    // 4. Mark agent run as started (status=running, started_at set)
    agentRunRepo.start(agentRun.id)
  } finally {
    lockRepo.release(lockKey, lockOwner)
  }
}
