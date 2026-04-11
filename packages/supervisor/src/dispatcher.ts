import type Database from 'better-sqlite3'
import { AgentRunRepository, TaskRepository, EventRepository } from '@taskhelm/core'
import type { ScheduledJob } from './scheduler.js'

/**
 * Executes a scheduled job by:
 * 1. Creating an AgentRun record (status=pending)
 * 2. Updating the task's current_agent_run_id
 * 3. Emitting an agent.run.started event
 * 4. Marking the agent run as running (status=running, started_at set)
 */
export function dispatchJob(db: Database.Database, job: ScheduledJob): void {
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
}
