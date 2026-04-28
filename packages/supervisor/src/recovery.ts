import type Database from 'better-sqlite3'

export interface RecoveryResult {
  readonly repairedServers: number
}

type DevServerRow = {
  id: string
  pid: number | null
  status: string
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Called once on startup to repair dev_server rows that were left in
 * 'running' or 'starting' after an unclean shutdown — if the recorded PID
 * is gone, mark the row as 'failed' so the dashboard reflects reality.
 */
export function recoverOnStartup(db: Database.Database): RecoveryResult {
  const now = new Date().toISOString()
  let repairedServers = 0

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

  return { repairedServers }
}
