import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as net from 'node:net'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import { TaskRepository } from '../../src/models/task.js'
import { findAvailablePort, isPortAvailable, allocatePort, releasePort } from '../../src/workspace/port.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_port__.db')
let db: Database.Database
let projectId: string
let taskId: string
let taskId2: string

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)

  const projectRepo = new ProjectRepository(db)
  const project = projectRepo.create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: '/tmp/test',
  })
  projectId = project.id

  const taskRepo = new TaskRepository(db)
  const task1 = taskRepo.create({ project_id: projectId, title: 'Task 1' })
  const task2 = taskRepo.create({ project_id: projectId, title: 'Task 2' })
  taskId = task1.id
  taskId2 = task2.id
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('isPortAvailable', () => {
  it('returns true for an unused port', async () => {
    // Use a high port likely to be free
    const available = await isPortAvailable(19876)
    expect(available).toBe(true)
  })

  it('returns false for a port that is in use', async () => {
    const server = net.createServer()
    await new Promise<void>((resolve) => server.listen(19877, '127.0.0.1', () => resolve()))

    try {
      const available = await isPortAvailable(19877)
      expect(available).toBe(false)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

describe('findAvailablePort', () => {
  it('returns a port within the default range (3001-3100)', async () => {
    const port = await findAvailablePort()
    expect(port).toBeGreaterThanOrEqual(3001)
    expect(port).toBeLessThanOrEqual(3100)
  })

  it('returns a port within a custom range', async () => {
    const port = await findAvailablePort({ min: 19800, max: 19900 })
    expect(port).toBeGreaterThanOrEqual(19800)
    expect(port).toBeLessThanOrEqual(19900)
  })

  it('throws when all ports in range are occupied', async () => {
    // Occupy a single port range
    const server = net.createServer()
    await new Promise<void>((resolve) => server.listen(19901, '127.0.0.1', () => resolve()))

    try {
      await expect(findAvailablePort({ min: 19901, max: 19901 })).rejects.toThrow(
        'No available port found in range 19901-19901'
      )
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

describe('allocatePort', () => {
  it('registers port in DB and returns the port number', async () => {
    const port = await allocatePort(db, projectId, taskId, { min: 19700, max: 19800 })
    expect(port).toBeGreaterThanOrEqual(19700)
    expect(port).toBeLessThanOrEqual(19800)

    const row = db
      .prepare('SELECT * FROM dev_servers WHERE port = ?')
      .get(port) as { port: number; project_id: string; task_id: string; status: string } | undefined

    expect(row).toBeDefined()
    expect(row!.project_id).toBe(projectId)
    expect(row!.task_id).toBe(taskId)
    expect(row!.status).toBe('starting')
  })

  it('will not allocate the same port twice', async () => {
    const port1 = await allocatePort(db, projectId, taskId, { min: 19600, max: 19610 })
    const port2 = await allocatePort(db, projectId, taskId2, { min: 19600, max: 19610 })

    expect(port1).not.toBe(port2)
  })

  it('skips ports already registered in DB even if available on network', async () => {
    // Insert an existing dev_server entry using the real project and task IDs
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO dev_servers (id, project_id, task_id, port, status, started_at)
       VALUES ('manual-id', ?, ?, 19500, 'running', ?)`
    ).run(projectId, taskId, now)

    // Allocate in the same range — should skip 19500
    const port = await allocatePort(db, projectId, taskId2, { min: 19500, max: 19505 })
    expect(port).toBeGreaterThan(19500)
  })
})

describe('releasePort', () => {
  it('marks port as stopped in DB', async () => {
    const port = await allocatePort(db, projectId, taskId, { min: 19400, max: 19450 })

    releasePort(db, port)

    const row = db
      .prepare('SELECT status, stopped_at FROM dev_servers WHERE port = ?')
      .get(port) as { status: string; stopped_at: string | null } | undefined

    expect(row).toBeDefined()
    expect(row!.status).toBe('stopped')
    expect(row!.stopped_at).not.toBeNull()
  })

  it('does nothing if port is not in DB', () => {
    // Should not throw
    expect(() => releasePort(db, 99999)).not.toThrow()
  })
})
