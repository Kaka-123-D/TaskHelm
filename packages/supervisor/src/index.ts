import { createDatabase, runMigrations } from '@taskhelm/core'
import { runOneCycle } from './loop.js'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdirSync } from 'node:fs'

const INTERVAL_MS = 5000

export function startSupervisor(dbPath?: string): NodeJS.Timeout {
  const resolvedPath = dbPath ?? join(homedir(), '.taskhelm', 'taskhelm.db')
  mkdirSync(join(homedir(), '.taskhelm'), { recursive: true })
  const db = createDatabase(resolvedPath)
  runMigrations(db)

  const interval = setInterval(() => {
    try {
      runOneCycle(db)
    } catch (error) {
      console.error('[supervisor] cycle error:', error)
    }
  }, INTERVAL_MS)

  // Run first cycle immediately
  try { runOneCycle(db) } catch {}

  return interval
}

export { runOneCycle } from './loop.js'
export { canTransition, nextPhase, phaseIndex } from './phase-machine.js'
export { getSchedulableJobs } from './scheduler.js'
export { dispatchJob } from './dispatcher.js'
export { startDevServer, stopDevServer, checkServerHealth, getPoolStatus } from './dev-pool.js'
export type { StartServerOptions } from './dev-pool.js'

// If run directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  console.error('[supervisor] starting...')
  startSupervisor()
}
