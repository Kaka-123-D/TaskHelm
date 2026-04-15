import type Database from 'better-sqlite3'
import { EventRepository } from '@taskhelm/core'
import { getSchedulableJobs } from './scheduler.js'
import { dispatchJob } from './dispatcher.js'
import { notify } from './notifier.js'

export interface CycleResult {
  readonly jobsDispatched: number
  readonly eventsProcessed: number
}

type TerminalRunRow = {
  id: string
  task_id: string
  kind: string
  status: string
  error_message: string | null
}

/**
 * Executes one supervisor cycle:
 * 1. Process terminal agent runs and clear current_agent_run_id
 * 2. Emit notifications/events for failures
 * 3. Dispatch any future schedulable jobs (currently none in local-first mode)
 */
export function runOneCycle(db: Database.Database): CycleResult {
  const eventRepo = new EventRepository(db)

  let jobsDispatched = 0
  let eventsProcessed = 0

  const terminalRuns = db
    .prepare(
      `SELECT ar.id, ar.task_id, ar.kind, ar.status, ar.error_message
       FROM agent_runs ar
       INNER JOIN tasks t ON t.id = ar.task_id
       WHERE t.current_agent_run_id = ar.id
         AND ar.status IN ('completed', 'failed')`
    )
    .all() as TerminalRunRow[]

  for (const run of terminalRuns) {
    if (run.status === 'completed') {
      db.prepare(
        `UPDATE tasks SET current_agent_run_id = NULL, updated_at = ? WHERE id = ?`
      ).run(new Date().toISOString(), run.task_id)

      eventRepo.append({
        entity_type: 'task',
        entity_id: run.task_id,
        event_type: 'task.agent_run.completed',
        payload_json: JSON.stringify({ agent_run_id: run.id, kind: run.kind }),
      })
      eventsProcessed++
    } else if (run.status === 'failed') {
      const errorMessage = run.error_message ?? 'Agent run failed'

      db.prepare(
        `UPDATE tasks SET latest_blocker = ?, current_agent_run_id = NULL, updated_at = ? WHERE id = ?`
      ).run(errorMessage, new Date().toISOString(), run.task_id)

      eventRepo.append({
        entity_type: 'task',
        entity_id: run.task_id,
        event_type: 'task.agent_run.failed',
        payload_json: JSON.stringify({ reason: errorMessage, agent_run_id: run.id }),
      })
      eventsProcessed++

      // Notify: agent run failed
      notify(db, {
        task_id: run.task_id,
        level: 'warning',
        channel: 'desktop',
        title: `Agent run failed (${run.kind})`,
        body: errorMessage,
      })

      // Notify: task blocked
      notify(db, {
        task_id: run.task_id,
        level: 'error',
        channel: 'desktop',
        title: 'Task needs attention',
        body: errorMessage,
      })
    }
  }

  // Step 3: Dispatch new jobs for tasks that were idle before this cycle.
  const jobs = getSchedulableJobs(db)
  for (const job of jobs) {
    dispatchJob(db, job)
    jobsDispatched++
    eventsProcessed++ // each dispatch emits one agent.run.started event
  }

  return { jobsDispatched, eventsProcessed }
}
