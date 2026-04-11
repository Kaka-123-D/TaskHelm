import type Database from 'better-sqlite3'

export interface RecoveryResult {
  readonly repairedServers: number
  readonly repairedRuns: number
}

type DevServerRow = {
  id: string
  pid: number | null
  status: string
}

type AgentRunRow = {
  id: string
  task_id: string
  status: string
}

/**
 * Returns true if the process with the given PID is alive.
 * Uses signal 0 which checks existence without sending a signal.
 */
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Called once on supervisor startup to repair any state left over from a
 * previous crash or unclean shutdown:
 *
 * 1. Find dev_servers with status 'running' or 'starting'.
 *    For each, check if the PID is still alive. If dead, mark as 'failed'.
 *
 * 2. Find agent_runs with status 'running'. These were interrupted mid-execution.
 *    Mark them as 'failed' with error "Supervisor restarted".
 *
 * 3. For tasks whose current_agent_run_id points to a now-failed run,
 *    clear current_agent_run_id and set status back to 'running' so the
 *    scheduler picks them up on the next cycle.
 */
export function recoverOnStartup(db: Database.Database): RecoveryResult {
  const now = new Date().toISOString()
  let repairedServers = 0
  let repairedRuns = 0

  // Step 1: Repair stale dev servers
  const liveStatuses = ['running', 'starting']
  const staleServers = db
    .prepare(
      `SELECT id, pid, status FROM dev_servers WHERE status IN ('running', 'starting')`
    )
    .all() as DevServerRow[]

  for (const server of staleServers) {
    const alive = server.pid !== null && isPidAlive(server.pid)
    if (!alive) {
      db.prepare(`UPDATE dev_servers SET status = 'failed', stopped_at = ? WHERE id = ?`).run(
        now,
        server.id
      )
      repairedServers++
    }
  }

  // Suppress unused variable warning — liveStatuses is intentionally kept for readability
  void liveStatuses

  // Step 2: Repair interrupted agent runs
  const interruptedRuns = db
    .prepare(`SELECT id, task_id, status FROM agent_runs WHERE status = 'running'`)
    .all() as AgentRunRow[]

  const repairedRunIds = new Set<string>()

  for (const run of interruptedRuns) {
    db.prepare(
      `UPDATE agent_runs
       SET status = 'failed', error_message = 'Supervisor restarted', finished_at = ?
       WHERE id = ?`
    ).run(now, run.id)

    repairedRunIds.add(run.id)
    repairedRuns++
  }

  // Step 3: For tasks pointing to a now-failed run, reset so scheduler can re-dispatch
  if (repairedRunIds.size > 0) {
    const placeholders = Array.from(repairedRunIds)
      .map(() => '?')
      .join(', ')

    db.prepare(
      `UPDATE tasks
       SET status = 'running', current_agent_run_id = NULL, updated_at = ?
       WHERE current_agent_run_id IN (${placeholders})`
    ).run(now, ...Array.from(repairedRunIds))
  }

  return { repairedServers, repairedRuns }
}
