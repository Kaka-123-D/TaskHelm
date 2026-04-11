import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { EventRepository } from '../../src/models/event.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_event__.db')
let db: Database.Database

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(TEST_DB + ext) } catch {}
  }
})

describe('EventRepository', () => {
  describe('append', () => {
    it('appends an event and returns it', () => {
      const repo = new EventRepository(db)

      const event = repo.append({
        entity_type: 'task',
        entity_id: 'task-123',
        event_type: 'task.created',
      })

      expect(event.id).toBeTruthy()
      expect(event.entity_type).toBe('task')
      expect(event.entity_id).toBe('task-123')
      expect(event.event_type).toBe('task.created')
      expect(event.payload_json).toBeNull()
      expect(event.created_at).toBeTruthy()
    })

    it('appends an event with payload_json', () => {
      const repo = new EventRepository(db)
      const payload = JSON.stringify({ status: 'draft', phase: 'context' })

      const event = repo.append({
        entity_type: 'task',
        entity_id: 'task-456',
        event_type: 'task.status_changed',
        payload_json: payload,
      })

      expect(event.payload_json).toBe(payload)
    })

    it('appends events for different entity types without foreign key constraint', () => {
      const repo = new EventRepository(db)

      // Events are append-only and do not require FK references
      expect(() => {
        repo.append({ entity_type: 'project', entity_id: 'proj-1', event_type: 'project.created' })
        repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'task.started' })
        repo.append({ entity_type: 'agent_run', entity_id: 'run-1', event_type: 'run.completed' })
      }).not.toThrow()
    })
  })

  describe('findByEntity', () => {
    it('returns all events for a given entity', () => {
      const repo = new EventRepository(db)

      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'task.created' })
      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'task.status_changed' })
      repo.append({ entity_type: 'task', entity_id: 'task-2', event_type: 'task.created' })

      const events = repo.findByEntity('task', 'task-1')
      expect(events.length).toBe(2)
      expect(events.every((e) => e.entity_id === 'task-1')).toBe(true)
    })

    it('returns empty array when no events for entity', () => {
      const repo = new EventRepository(db)
      expect(repo.findByEntity('task', 'nonexistent')).toEqual([])
    })
  })

  describe('findByType', () => {
    it('returns all events of a given type', () => {
      const repo = new EventRepository(db)

      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'task.created' })
      repo.append({ entity_type: 'task', entity_id: 'task-2', event_type: 'task.created' })
      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'task.status_changed' })

      const events = repo.findByType('task.created')
      expect(events.length).toBe(2)
      expect(events.every((e) => e.event_type === 'task.created')).toBe(true)
    })

    it('returns empty array when no events of that type', () => {
      const repo = new EventRepository(db)
      expect(repo.findByType('nonexistent.event')).toEqual([])
    })
  })

  describe('findRecent', () => {
    it('returns the most recent events ordered by created_at DESC', () => {
      const repo = new EventRepository(db)

      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'event.a' })
      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'event.b' })
      repo.append({ entity_type: 'task', entity_id: 'task-1', event_type: 'event.c' })

      const events = repo.findRecent()
      expect(events.length).toBe(3)
      // Most recent first — c was inserted last
      expect(events[0].event_type).toBe('event.c')
      expect(events[2].event_type).toBe('event.a')
    })

    it('defaults to 50 events', () => {
      const repo = new EventRepository(db)

      for (let i = 0; i < 60; i++) {
        repo.append({ entity_type: 'task', entity_id: `task-${i}`, event_type: 'batch.event' })
      }

      const events = repo.findRecent()
      expect(events.length).toBe(50)
    })

    it('respects a custom limit', () => {
      const repo = new EventRepository(db)

      for (let i = 0; i < 10; i++) {
        repo.append({ entity_type: 'task', entity_id: `task-${i}`, event_type: 'batch.event' })
      }

      const events = repo.findRecent(5)
      expect(events.length).toBe(5)
    })
  })

  describe('append-only — no update or delete', () => {
    it('does not expose update or delete methods', () => {
      const repo = new EventRepository(db)
      expect((repo as unknown as Record<string, unknown>)['update']).toBeUndefined()
      expect((repo as unknown as Record<string, unknown>)['delete']).toBeUndefined()
    })
  })
})
