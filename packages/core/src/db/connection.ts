import { createRequire } from 'node:module'
import type BetterSqlite3 from 'better-sqlite3'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3') as typeof BetterSqlite3

export function createDatabase(dbPath: string): BetterSqlite3.Database {
  if (typeof dbPath !== 'string' || dbPath.trim().length === 0) {
    throw new Error('TaskHelm database path must be a non-empty string')
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  return db
}
