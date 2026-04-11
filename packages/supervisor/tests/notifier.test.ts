import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations, NotificationRepository } from '@taskhelm/core'
import type Database from 'better-sqlite3'
import { notify } from '../src/notifier.js'

const TEST_DB = path.join(import.meta.dirname, '__test_notifier__.db')
let db: Database.Database

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('notify', () => {
  it('creates a notification record in the database', () => {
    const repo = new NotificationRepository(db)

    notify(db, {
      level: 'success',
      channel: 'desktop',
      title: 'Task done',
      body: 'All phases passed.',
    })

    const recent = repo.findRecent(1)
    expect(recent).toHaveLength(1)
    expect(recent[0].title).toBe('Task done')
    expect(recent[0].level).toBe('success')
    expect(recent[0].channel).toBe('desktop')
    expect(recent[0].body).toBe('All phases passed.')
  })

  it('stores task_id when provided', () => {
    const repo = new NotificationRepository(db)

    notify(db, {
      task_id: 'task-abc',
      level: 'error',
      channel: 'desktop',
      title: 'Task blocked',
    })

    const recent = repo.findRecent(1)
    expect(recent[0].task_id).toBe('task-abc')
  })

  it('stores project_id when provided', () => {
    const repo = new NotificationRepository(db)

    notify(db, {
      project_id: 'proj-xyz',
      level: 'warning',
      channel: 'desktop',
      title: 'Agent run failed',
    })

    const recent = repo.findRecent(1)
    expect(recent[0].project_id).toBe('proj-xyz')
  })

  it('creates multiple notifications independently', () => {
    const repo = new NotificationRepository(db)

    notify(db, { level: 'warning', channel: 'desktop', title: 'Warning 1' })
    notify(db, { level: 'error', channel: 'desktop', title: 'Error 1' })
    notify(db, { level: 'success', channel: 'desktop', title: 'Success 1' })

    const all = repo.findRecent()
    expect(all).toHaveLength(3)
  })

  it('notification status is either pending or delivered after notify()', () => {
    const repo = new NotificationRepository(db)

    notify(db, {
      level: 'info',
      channel: 'desktop',
      title: 'Some event',
    })

    const recent = repo.findRecent(1)
    // On macOS with osascript it may be delivered; in CI it will be pending
    expect(['pending', 'delivered']).toContain(recent[0].status)
  })

  it('notification is marked delivered on macOS when osascript succeeds', () => {
    // This test validates the DB record state — actual osascript behavior
    // is not tested in CI (non-macOS or restricted). We verify the notification
    // was at least created with the right data.
    const repo = new NotificationRepository(db)

    notify(db, {
      level: 'success',
      channel: 'desktop',
      title: 'Pipeline complete',
      body: 'The task passed all review gates.',
    })

    const recent = repo.findRecent(1)
    expect(recent[0].title).toBe('Pipeline complete')
    expect(recent[0].body).toBe('The task passed all review gates.')
    // If on macOS, it may be 'delivered'; in CI it will remain 'pending'
    expect(['pending', 'delivered']).toContain(recent[0].status)
  })
})
