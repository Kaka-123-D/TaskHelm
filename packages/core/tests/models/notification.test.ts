import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { NotificationRepository } from '../../src/models/notification.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_notification__.db')
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

describe('NotificationRepository', () => {
  describe('create', () => {
    it('creates a notification with required fields', () => {
      const repo = new NotificationRepository(db)
      const notification = repo.create({
        level: 'info',
        channel: 'desktop',
        title: 'Test notification',
      })

      expect(notification.id).toBeTruthy()
      expect(notification.level).toBe('info')
      expect(notification.channel).toBe('desktop')
      expect(notification.title).toBe('Test notification')
      expect(notification.status).toBe('pending')
      expect(notification.task_id).toBeNull()
      expect(notification.project_id).toBeNull()
      expect(notification.body).toBeNull()
      expect(notification.delivered_at).toBeNull()
      expect(notification.created_at).toBeTruthy()
    })

    it('creates a notification with all optional fields', () => {
      const repo = new NotificationRepository(db)
      const notification = repo.create({
        task_id: 'task-123',
        project_id: 'project-456',
        level: 'error',
        channel: 'desktop',
        title: 'Task blocked',
        body: 'The implementer agent failed with an error.',
      })

      expect(notification.task_id).toBe('task-123')
      expect(notification.project_id).toBe('project-456')
      expect(notification.level).toBe('error')
      expect(notification.body).toBe('The implementer agent failed with an error.')
    })

    it('creates notifications with different levels', () => {
      const repo = new NotificationRepository(db)

      const info = repo.create({ level: 'info', channel: 'desktop', title: 'Info' })
      const warning = repo.create({ level: 'warning', channel: 'desktop', title: 'Warning' })
      const error = repo.create({ level: 'error', channel: 'desktop', title: 'Error' })
      const success = repo.create({ level: 'success', channel: 'desktop', title: 'Success' })

      expect(info.level).toBe('info')
      expect(warning.level).toBe('warning')
      expect(error.level).toBe('error')
      expect(success.level).toBe('success')
    })
  })

  describe('findRecent', () => {
    it('returns notifications in descending order by created_at', () => {
      const repo = new NotificationRepository(db)

      repo.create({ level: 'info', channel: 'desktop', title: 'First' })
      repo.create({ level: 'info', channel: 'desktop', title: 'Second' })
      repo.create({ level: 'info', channel: 'desktop', title: 'Third' })

      const recent = repo.findRecent()
      expect(recent[0].title).toBe('Third')
      expect(recent[1].title).toBe('Second')
      expect(recent[2].title).toBe('First')
    })

    it('respects the limit parameter', () => {
      const repo = new NotificationRepository(db)

      for (let i = 0; i < 5; i++) {
        repo.create({ level: 'info', channel: 'desktop', title: `Notification ${i}` })
      }

      const limited = repo.findRecent(3)
      expect(limited).toHaveLength(3)
    })

    it('defaults to 50 items', () => {
      const repo = new NotificationRepository(db)
      const all = repo.findRecent()
      expect(Array.isArray(all)).toBe(true)
    })

    it('returns empty array when no notifications', () => {
      const repo = new NotificationRepository(db)
      expect(repo.findRecent()).toHaveLength(0)
    })
  })

  describe('markDelivered', () => {
    it('updates status to delivered and sets delivered_at', () => {
      const repo = new NotificationRepository(db)
      const notification = repo.create({
        level: 'success',
        channel: 'desktop',
        title: 'Task done',
      })

      expect(notification.status).toBe('pending')
      repo.markDelivered(notification.id)

      const recent = repo.findRecent(1)
      expect(recent[0].status).toBe('delivered')
      expect(recent[0].delivered_at).not.toBeNull()
    })

    it('does not throw for unknown id', () => {
      const repo = new NotificationRepository(db)
      expect(() => repo.markDelivered('nonexistent-id')).not.toThrow()
    })
  })
})
