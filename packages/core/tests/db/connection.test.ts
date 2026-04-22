import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, unlinkSync } from 'node:fs'
import { createDatabase } from '../../src/db/connection.js'

const TEST_DB_PATH = '/tmp/taskhelm-test-connection.db'

afterEach(() => {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }
})

describe('createDatabase', () => {
  it('throws a clear error when dbPath is empty', () => {
    expect(() => createDatabase('')).toThrowError(
      'TaskHelm database path must be a non-empty string',
    )
  })

  it('opens a database when dbPath is valid', () => {
    const db = createDatabase(TEST_DB_PATH)
    expect(db.open).toBe(true)
    db.close()
  })
})
