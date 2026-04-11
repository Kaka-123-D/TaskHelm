import { createDatabase, runMigrations } from '@taskhelm/core'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdirSync } from 'node:fs'

let _db: ReturnType<typeof createDatabase> | null = null

export function getDb() {
  if (_db) return _db
  const dbPath = process.env.TASKHELM_DB ?? join(homedir(), '.taskhelm', 'taskhelm.db')
  mkdirSync(join(homedir(), '.taskhelm'), { recursive: true })
  _db = createDatabase(dbPath)
  runMigrations(_db)
  return _db
}
