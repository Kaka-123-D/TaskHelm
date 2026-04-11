import type Database from 'better-sqlite3'
import { TaskRepository, EventRepository, ReviewGateRepository } from '@taskhelm/core'
import type { TaskPhaseValue } from '@taskhelm/core'
import { getSchedulableJobs } from './scheduler.js'
import { dispatchJob } from './dispatcher.js'
import { nextPhase } from './phase-machine.js'

// Phases that require a review gate to be opened when entered
const REVIEW_PHASE_TO_GATE: Readonly<Record<string, string>> = {
  spec_review: 'spec_compliance',
  code_review: 'code_quality',
  runtime_verification: 'runtime_verification',
}

// Agent run kinds that correspond to review phases
const REVIEW_KINDS = new Set(['spec_review', 'code_review', 'runtime_verify'])

/**
 * Ensures a review gate exists and is open for the given task+phase.
 * If a gate already exists (e.g. idempotent re-run), it is left alone.
 * Returns the gate id that was created or already existed.
 */
function ensureReviewGateOpen(
  db: Database.Database,
  taskId: string,
  phase: TaskPhaseValue
): void {
  const gateType = REVIEW_PHASE_TO_GATE[phase]
  if (!gateType) return

  const gateRepo = new ReviewGateRepository(db)
  const existing = gateRepo.findByTaskId(taskId).find((g) => g.gate_type === gateType)

  if (existing) {
    // If it was previously failed or pending, re-open it for a new attempt
    if (existing.status === 'pending' || existing.status === 'failed') {
      gateRepo.open(existing.id)
    }
    return
  }

  const gate = gateRepo.create({ task_id: taskId, gate_type: gateType })
  gateRepo.open(gate.id)
}

/**
 * If the agent run kind is a review kind, close the corresponding open gate.
 * Pass `passed=true` on completion, `passed=false` on failure.
 */
function closeReviewGate(
  db: Database.Database,
  taskId: string,
  runKind: string,
  passed: boolean
): void {
  if (!REVIEW_KINDS.has(runKind)) return

  const gateRepo = new ReviewGateRepository(db)
  const gates = gateRepo.findByTaskId(taskId)
  const openGate = gates.find((g) => g.status === 'open')
  if (!openGate) return

  if (passed) {
    gateRepo.pass(openGate.id)
  } else {
    gateRepo.fail(openGate.id)
  }
}

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
 * 1. Process completed/failed agent runs (advance phases, block tasks)
 * 2. Mark tasks as done when they reach final_summary with no pending work
 * 3. Dispatch new jobs for tasks that were already idle before this cycle
 *
 * Tasks that had their phase advanced in step 1 are skipped in step 3 so
 * the caller sees a clean state after each cycle — dispatch happens on the
 * *next* cycle for freshly-transitioned tasks.
 */
export function runOneCycle(db: Database.Database): CycleResult {
  const taskRepo = new TaskRepository(db)
  const eventRepo = new EventRepository(db)

  let jobsDispatched = 0
  let eventsProcessed = 0

  // Track tasks touched in this cycle so we don't immediately re-dispatch.
  const transitionedTaskIds = new Set<string>()

  // Step 1: Process completed/failed agent runs BEFORE scheduling new jobs.
  const terminalRuns = db
    .prepare(
      `SELECT ar.id, ar.task_id, ar.kind, ar.status, ar.error_message
       FROM agent_runs ar
       INNER JOIN tasks t ON t.id = ar.task_id
       WHERE t.status = 'running'
         AND t.current_agent_run_id = ar.id
         AND ar.status IN ('completed', 'failed')`
    )
    .all() as TerminalRunRow[]

  for (const run of terminalRuns) {
    if (run.status === 'completed') {
      const task = taskRepo.findById(run.task_id)
      if (task === null) continue

      // Close (pass) any open review gate for this run's kind
      closeReviewGate(db, task.id, run.kind, true)

      const next = nextPhase(task.phase)

      // Clear current_agent_run_id
      db.prepare(
        `UPDATE tasks SET current_agent_run_id = NULL, updated_at = ? WHERE id = ?`
      ).run(new Date().toISOString(), task.id)

      if (next !== null) {
        taskRepo.updatePhase(task.id, next)

        // Open review gate if the new phase requires one
        ensureReviewGateOpen(db, task.id, next)

        eventRepo.append({
          entity_type: 'task',
          entity_id: task.id,
          event_type: 'task.phase.advanced',
          payload_json: JSON.stringify({ from: task.phase, to: next }),
        })
        eventsProcessed++
      }

      // Mark as transitioned — do not dispatch a new job this cycle
      transitionedTaskIds.add(task.id)
    } else if (run.status === 'failed') {
      const errorMessage = run.error_message ?? 'Agent run failed'

      // Close (fail) any open review gate for this run's kind
      closeReviewGate(db, run.task_id, run.kind, false)

      db.prepare(
        `UPDATE tasks SET status = 'blocked', latest_blocker = ?, current_agent_run_id = NULL, updated_at = ? WHERE id = ?`
      ).run(errorMessage, new Date().toISOString(), run.task_id)

      eventRepo.append({
        entity_type: 'task',
        entity_id: run.task_id,
        event_type: 'task.blocked',
        payload_json: JSON.stringify({ reason: errorMessage, agent_run_id: run.id }),
      })
      eventsProcessed++

      transitionedTaskIds.add(run.task_id)
    }
  }

  // Step 2: Mark tasks as done when they reach final_summary with no pending work.
  const finalSummaryTasks = db
    .prepare(
      `SELECT id FROM tasks
       WHERE status = 'running'
         AND phase = 'final_summary'
         AND current_agent_run_id IS NULL`
    )
    .all() as { id: string }[]

  for (const row of finalSummaryTasks) {
    // Skip tasks that just transitioned into final_summary this cycle
    if (transitionedTaskIds.has(row.id)) continue

    taskRepo.updateStatus(row.id, 'done')

    eventRepo.append({
      entity_type: 'task',
      entity_id: row.id,
      event_type: 'task.done',
    })
    eventsProcessed++
  }

  // Step 3: Dispatch new jobs for tasks that were idle before this cycle.
  // Skip tasks that just transitioned — they will be dispatched next cycle.
  const jobs = getSchedulableJobs(db)
  for (const job of jobs) {
    if (transitionedTaskIds.has(job.taskId)) continue
    dispatchJob(db, job)
    jobsDispatched++
    eventsProcessed++ // each dispatch emits one agent.run.started event
  }

  return { jobsDispatched, eventsProcessed }
}
