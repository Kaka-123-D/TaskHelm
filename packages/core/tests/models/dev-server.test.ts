import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import { DevServerRepository } from '../../src/models/dev-server.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_dev_server__.db')
let db: Database.Database
let projectId: string

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)

  const projectRepo = new ProjectRepository(db)
  const project = projectRepo.create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: '/tmp/test',
    max_active_dev_servers: 3,
  })
  projectId = project.id
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('DevServerRepository.create', () => {
  it('creates a dev server with defaults', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3001 })

    expect(server.id).toBeTruthy()
    expect(server.project_id).toBe(projectId)
    expect(server.port).toBe(3001)
    expect(server.status).toBe('starting')
    expect(server.pid).toBeNull()
    expect(server.task_id).toBeNull()
    expect(server.health_url).toBeNull()
    expect(server.log_path).toBeNull()
    expect(server.error_message).toBeNull()
    expect(server.started_at).toBeTruthy()
    expect(server.stopped_at).toBeNull()
  })

  it('persists log_path when supplied', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({
      project_id: projectId,
      port: 3004,
      log_path: '/tmp/log/dev-server.log',
    })

    expect(server.log_path).toBe('/tmp/log/dev-server.log')
  })

  it('creates a dev server with all optional fields', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({
      project_id: projectId,
      task_id: 'task-abc',
      port: 3002,
      status: 'warm',
      health_url: 'http://localhost:3002/health',
    })

    expect(server.task_id).toBe('task-abc')
    expect(server.status).toBe('warm')
    expect(server.health_url).toBe('http://localhost:3002/health')
  })
})

describe('DevServerRepository.findById', () => {
  it('returns null for unknown id', () => {
    const repo = new DevServerRepository(db)
    expect(repo.findById('nonexistent')).toBeNull()
  })

  it('finds created server by id', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3003 })
    const found = repo.findById(server.id)

    expect(found).not.toBeNull()
    expect(found!.id).toBe(server.id)
    expect(found!.port).toBe(3003)
  })
})

describe('DevServerRepository.findByProjectId', () => {
  it('returns all servers for a project', () => {
    const repo = new DevServerRepository(db)
    repo.create({ project_id: projectId, port: 3010 })
    repo.create({ project_id: projectId, port: 3011 })

    const servers = repo.findByProjectId(projectId)
    expect(servers).toHaveLength(2)
  })

  it('returns empty array for project with no servers', () => {
    const repo = new DevServerRepository(db)
    const servers = repo.findByProjectId('unknown-project')
    expect(servers).toHaveLength(0)
  })
})

describe('DevServerRepository.findByTaskId', () => {
  it('finds server by task id', () => {
    const repo = new DevServerRepository(db)
    repo.create({ project_id: projectId, task_id: 'task-xyz', port: 3020 })

    const found = repo.findByTaskId('task-xyz')
    expect(found).not.toBeNull()
    expect(found!.task_id).toBe('task-xyz')
  })

  it('returns null if no server for task', () => {
    const repo = new DevServerRepository(db)
    expect(repo.findByTaskId('nonexistent')).toBeNull()
  })
})

describe('DevServerRepository.findByPort', () => {
  it('finds server by port number', () => {
    const repo = new DevServerRepository(db)
    repo.create({ project_id: projectId, port: 3030 })

    const found = repo.findByPort(3030)
    expect(found).not.toBeNull()
    expect(found!.port).toBe(3030)
  })

  it('returns null if no server on port', () => {
    const repo = new DevServerRepository(db)
    expect(repo.findByPort(9999)).toBeNull()
  })
})

describe('DevServerRepository.updateStatus', () => {
  it('updates status and sets stopped_at when stopped', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3040 })

    const updated = repo.updateStatus(server.id, 'stopped')
    expect(updated.status).toBe('stopped')
    expect(updated.stopped_at).not.toBeNull()
  })

  it('updates status without setting stopped_at for non-stopped status', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3041 })

    const updated = repo.updateStatus(server.id, 'running')
    expect(updated.status).toBe('running')
    expect(updated.stopped_at).toBeNull()
  })

  it('throws if server not found', () => {
    const repo = new DevServerRepository(db)
    expect(() => repo.updateStatus('nonexistent', 'running')).toThrow('DevServer not found')
  })
})

describe('DevServerRepository.updateErrorMessage', () => {
  it('sets and clears error_message', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3045 })

    const set = repo.updateErrorMessage(server.id, 'boom: missing dep')
    expect(set.error_message).toBe('boom: missing dep')

    const cleared = repo.updateErrorMessage(server.id, null)
    expect(cleared.error_message).toBeNull()
  })

  it('throws if server not found', () => {
    const repo = new DevServerRepository(db)
    expect(() => repo.updateErrorMessage('nonexistent', 'x')).toThrow('DevServer not found')
  })
})

describe('DevServerRepository.updatePid', () => {
  it('updates pid on server record', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3050 })

    const updated = repo.updatePid(server.id, 12345)
    expect(updated.pid).toBe(12345)
  })

  it('throws if server not found', () => {
    const repo = new DevServerRepository(db)
    expect(() => repo.updatePid('nonexistent', 999)).toThrow('DevServer not found')
  })
})

describe('DevServerRepository.delete', () => {
  it('removes the server from DB', () => {
    const repo = new DevServerRepository(db)
    const server = repo.create({ project_id: projectId, port: 3060 })
    repo.delete(server.id)

    expect(repo.findById(server.id)).toBeNull()
  })
})

describe('DevServerRepository.countActiveByProject', () => {
  it('counts servers with active statuses', () => {
    const repo = new DevServerRepository(db)
    repo.create({ project_id: projectId, port: 3070, status: 'starting' })
    repo.create({ project_id: projectId, port: 3071, status: 'running' })
    repo.create({ project_id: projectId, port: 3072, status: 'warm' })
    repo.create({ project_id: projectId, port: 3073, status: 'stopped' })
    repo.create({ project_id: projectId, port: 3074, status: 'failed' })

    const count = repo.countActiveByProject(projectId)
    expect(count).toBe(3)
  })

  it('returns 0 when no active servers', () => {
    const repo = new DevServerRepository(db)
    const count = repo.countActiveByProject(projectId)
    expect(count).toBe(0)
  })
})
