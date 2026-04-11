import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { Lock } from '../types.js'

const DEFAULT_TTL_SECONDS = 60

type LockRow = {
  key: string
  owner: string
  expires_at: string | null
  created_at: string
}

function rowToLock(row: LockRow): Lock {
  return {
    key: row.key,
    owner: row.owner,
    expires_at: row.expires_at,
    created_at: row.created_at,
  }
}

export class LockRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Try to acquire a lock for the given key and owner.
   * - If no lock exists, inserts a new one. Returns true.
   * - If a lock exists and has not expired, returns false.
   * - If a lock exists but has expired, replaces it. Returns true.
   */
  acquire(key: string, owner: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): boolean {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString()
    const nowIso = now.toISOString()

    // Try to delete an expired lock first
    this.db
      .prepare(`DELETE FROM locks WHERE key = ? AND expires_at IS NOT NULL AND expires_at <= ?`)
      .run(key, nowIso)

    // Now try to insert — will fail if key already exists (not expired)
    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO locks (key, owner, expires_at, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(key, owner, expiresAt, nowIso)

    return result.changes > 0
  }

  /**
   * Release the lock for the given key, but only if the owner matches.
   * Returns true if a lock was deleted, false otherwise.
   */
  release(key: string, owner: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM locks WHERE key = ? AND owner = ?`)
      .run(key, owner)

    return result.changes > 0
  }

  /**
   * Returns true if a non-expired lock exists for the given key.
   */
  isHeld(key: string): boolean {
    const nowIso = new Date().toISOString()
    const row = this.db
      .prepare(
        `SELECT key FROM locks
         WHERE key = ?
           AND (expires_at IS NULL OR expires_at > ?)`
      )
      .get(key, nowIso)

    return row !== undefined
  }

  /**
   * Find a lock by key. Returns null if not found or expired.
   */
  findByKey(key: string): Lock | null {
    const row = this.db
      .prepare('SELECT * FROM locks WHERE key = ?')
      .get(key) as LockRow | undefined

    return row ? rowToLock(row) : null
  }

  /**
   * Delete all expired locks. Returns the number deleted.
   */
  cleanExpired(): number {
    const nowIso = new Date().toISOString()
    const result = this.db
      .prepare(`DELETE FROM locks WHERE expires_at IS NOT NULL AND expires_at <= ?`)
      .run(nowIso)

    return result.changes
  }
}
