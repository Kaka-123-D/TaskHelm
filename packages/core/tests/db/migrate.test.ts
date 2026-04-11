import { describe, it, expect, afterEach } from 'vitest'
import { unlinkSync, existsSync } from 'node:fs'
import { createDatabase } from '../../src/db/connection'
import { runMigrations } from '../../src/db/migrate'

const TEST_DB_PATH = '/tmp/taskhelm-test-migrate.db'

afterEach(() => {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }
})

describe('createDatabase', () => {
  it('creates a database with WAL journal mode', () => {
    const db = createDatabase(TEST_DB_PATH)
    const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }
    expect(row.journal_mode).toBe('wal')
    db.close()
  })

  it('enables foreign keys', () => {
    const db = createDatabase(TEST_DB_PATH)
    const row = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }
    expect(row.foreign_keys).toBe(1)
    db.close()
  })
})

describe('runMigrations', () => {
  it('creates the _migrations tracking table', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    ).get()
    expect(row).toBeTruthy()
    db.close()
  })

  it('creates all 8 domain tables', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const expectedTables = [
      'projects',
      'tasks',
      'agent_runs',
      'review_gates',
      'dev_servers',
      'notifications',
      'locks',
      'events',
    ]

    for (const table of expectedTables) {
      const row = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      ).get()
      expect(row, `expected table "${table}" to exist`).toBeTruthy()
    }

    db.close()
  })

  it('records applied migrations in _migrations table', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const rows = db.prepare('SELECT filename FROM _migrations ORDER BY filename').all() as Array<{ filename: string }>
    expect(rows.length).toBe(8)
    expect(rows[0].filename).toMatch(/001_projects/)
    expect(rows[7].filename).toMatch(/008_events/)
    db.close()
  })

  it('is idempotent — running twice does not throw', () => {
    const db = createDatabase(TEST_DB_PATH)
    expect(() => {
      runMigrations(db)
      runMigrations(db)
    }).not.toThrow()
    db.close()
  })

  it('skips already-applied migrations on second run', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)
    const countBefore = (db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number }).n

    runMigrations(db)
    const countAfter = (db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number }).n

    expect(countAfter).toBe(countBefore)
    db.close()
  })
})
