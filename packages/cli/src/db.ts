import { createDatabase, runMigrations } from '@taskhelm/core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type Database from 'better-sqlite3'

export function getDb(): Database.Database {
  const dbPath = process.env.TASKHELM_DB ?? join(homedir(), '.taskhelm', 'taskhelm.db')
  mkdirSync(join(homedir(), '.taskhelm'), { recursive: true })
  const db = createDatabase(dbPath)
  runMigrations(db)
  return db
}
