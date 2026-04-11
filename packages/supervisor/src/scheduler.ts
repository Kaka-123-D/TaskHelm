import type Database from 'better-sqlite3'

export interface ScheduledJob {
  readonly taskId: string
  readonly kind: string // 'implementer' | 'spec_review' | 'code_review' | 'runtime_verify'
}

const PHASE_TO_JOB: Readonly<Record<string, string>> = {
  implementation: 'implementer',
  spec_review: 'spec_review',
  code_review: 'code_review',
  runtime_verification: 'runtime_verify',
}

type TaskRow = {
  id: string
  phase: string
  current_agent_run_id: string | null
}

/**
 * Returns all tasks that are in 'running' status and have no active agent run,
 * filtered to phases that require a job. Each eligible task produces one ScheduledJob.
 */
export function getSchedulableJobs(db: Database.Database): readonly ScheduledJob[] {
  // Select running tasks with no current active agent run
  // "active" means current_agent_run_id points to a run that is pending or running
  const rows = db
    .prepare(
      `SELECT t.id, t.phase, t.current_agent_run_id
       FROM tasks t
       WHERE t.status = 'running'
         AND (
           t.current_agent_run_id IS NULL
           OR EXISTS (
             SELECT 1 FROM agent_runs ar
             WHERE ar.id = t.current_agent_run_id
               AND ar.status IN ('completed', 'failed')
           )
         )`
    )
    .all() as TaskRow[]

  const jobs: ScheduledJob[] = []

  for (const row of rows) {
    const kind = PHASE_TO_JOB[row.phase]
    if (kind !== undefined) {
      jobs.push({ taskId: row.id, kind })
    }
  }

  return jobs
}
