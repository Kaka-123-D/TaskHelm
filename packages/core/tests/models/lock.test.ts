import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations } from '../../src/db/connection.js'
import { runMigrations as migrate } from '../../src/db/migrate.js'
import { LockRepository } from '../../src/models/lock.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_lock__.db')
let db: Database.Database

beforeEach(() => {
  db = createDatabase(TEST_DB)
  migrate(db)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('LockRepository', () => {
  describe('acquire', () => {
    it('returns true on first acquisition', () => {
      const repo = new LockRepository(db)
      const acquired = repo.acquire('task:abc:dispatch', 'supervisor-1')
      expect(acquired).toBe(true)
    })

    it('returns false when lock is already held by a different owner', () => {
      const repo = new LockRepository(db)
      repo.acquire('task:abc:dispatch', 'owner-A')
      const second = repo.acquire('task:abc:dispatch', 'owner-B')
      expect(second).toBe(false)
    })

    it('returns false when trying to re-acquire same key same owner (lock already held)', () => {
      const repo = new LockRepository(db)
      repo.acquire('task:xyz:dispatch', 'owner-A')
      const second = repo.acquire('task:xyz:dispatch', 'owner-A')
      expect(second).toBe(false)
    })

    it('stores owner and expiry on successful acquire', () => {
      const repo = new LockRepository(db)
      const before = new Date()
      repo.acquire('task:store:dispatch', 'owner-stored', 30)
      const lock = repo.findByKey('task:store:dispatch')
      expect(lock).not.toBeNull()
      expect(lock!.owner).toBe('owner-stored')
      expect(lock!.expires_at).not.toBeNull()
      const expiresAt = new Date(lock!.expires_at!)
      expect(expiresAt.getTime()).toBeGreaterThan(before.getTime())
    })

    it('allows re-acquiring an expired lock', () => {
      const repo = new LockRepository(db)

      // Insert an already-expired lock directly
      const expiredAt = new Date(Date.now() - 5000).toISOString()
      db.prepare(`INSERT INTO locks (key, owner, expires_at, created_at) VALUES (?, ?, ?, ?)`)
        .run('task:expired:dispatch', 'old-owner', expiredAt, new Date().toISOString())

      const acquired = repo.acquire('task:expired:dispatch', 'new-owner')
      expect(acquired).toBe(true)

      const lock = repo.findByKey('task:expired:dispatch')
      expect(lock!.owner).toBe('new-owner')
    })
  })

  describe('release', () => {
    it('returns true and removes the lock when owner matches', () => {
      const repo = new LockRepository(db)
      repo.acquire('task:rel:dispatch', 'owner-X')
      const released = repo.release('task:rel:dispatch', 'owner-X')
      expect(released).toBe(true)
      expect(repo.isHeld('task:rel:dispatch')).toBe(false)
    })

    it('returns false and keeps lock when owner does not match', () => {
      const repo = new LockRepository(db)
      repo.acquire('task:rel2:dispatch', 'owner-A')
      const released = repo.release('task:rel2:dispatch', 'owner-B')
      expect(released).toBe(false)
      expect(repo.isHeld('task:rel2:dispatch')).toBe(true)
    })

    it('returns false when lock does not exist', () => {
      const repo = new LockRepository(db)
      const released = repo.release('nonexistent:key', 'any-owner')
      expect(released).toBe(false)
    })
  })

  describe('isHeld', () => {
    it('returns true for a held lock', () => {
      const repo = new LockRepository(db)
      repo.acquire('task:held:dispatch', 'owner-Y')
      expect(repo.isHeld('task:held:dispatch')).toBe(true)
    })

    it('returns false for a lock that does not exist', () => {
      const repo = new LockRepository(db)
      expect(repo.isHeld('task:missing:dispatch')).toBe(false)
    })

    it('returns false for an expired lock', () => {
      const repo = new LockRepository(db)
      const expiredAt = new Date(Date.now() - 1000).toISOString()
      db.prepare(`INSERT INTO locks (key, owner, expires_at, created_at) VALUES (?, ?, ?, ?)`)
        .run('task:exp-check:dispatch', 'owner-Z', expiredAt, new Date().toISOString())
      expect(repo.isHeld('task:exp-check:dispatch')).toBe(false)
    })
  })

  describe('cleanExpired', () => {
    it('deletes expired locks and returns count', () => {
      const repo = new LockRepository(db)
      const expiredAt = new Date(Date.now() - 1000).toISOString()
      const nowIso = new Date().toISOString()

      db.prepare(`INSERT INTO locks (key, owner, expires_at, created_at) VALUES (?, ?, ?, ?)`)
        .run('expired-1', 'owner', expiredAt, nowIso)
      db.prepare(`INSERT INTO locks (key, owner, expires_at, created_at) VALUES (?, ?, ?, ?)`)
        .run('expired-2', 'owner', expiredAt, nowIso)

      // Also add a valid lock
      repo.acquire('valid-lock', 'owner', 60)

      const cleaned = repo.cleanExpired()
      expect(cleaned).toBe(2)
      expect(repo.isHeld('valid-lock')).toBe(true)
    })

    it('returns 0 when no expired locks exist', () => {
      const repo = new LockRepository(db)
      repo.acquire('fresh-lock', 'owner', 60)
      const cleaned = repo.cleanExpired()
      expect(cleaned).toBe(0)
    })
  })
})
