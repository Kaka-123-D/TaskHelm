import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import { TaskRepository } from '../../src/models/task.js'
import { AgentRunRepository } from '../../src/models/agent-run.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_agent_run__.db')
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

function createTestTask(db: Database.Database) {
  const project = new ProjectRepository(db).create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: '/home/user/test',
  })
  return new TaskRepository(db).create({
    project_id: project.id,
    title: 'Test Task',
  })
}

describe('AgentRunRepository', () => {
  describe('create + findById', () => {
    it('creates an agent run and retrieves it by id', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)

      const run = repo.create({ task_id: task.id, kind: 'implementer' })

      expect(run.id).toBeTruthy()
      expect(run.task_id).toBe(task.id)
      expect(run.kind).toBe('implementer')
      expect(run.status).toBe('pending')
      expect(run.role).toBeNull()
      expect(run.input_ref).toBeNull()
      expect(run.output_ref).toBeNull()
      expect(run.error_message).toBeNull()
      expect(run.started_at).toBeNull()
      expect(run.finished_at).toBeNull()
      expect(run.created_at).toBeTruthy()

      const found = repo.findById(run.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(run.id)
    })

    it('returns null for unknown id', () => {
      const repo = new AgentRunRepository(db)
      expect(repo.findById('nonexistent')).toBeNull()
    })

    it('creates a run with optional fields', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)

      const run = repo.create({
        task_id: task.id,
        kind: 'spec_review',
        role: 'reviewer',
        input_ref: '/path/to/input',
      })

      expect(run.role).toBe('reviewer')
      expect(run.input_ref).toBe('/path/to/input')
    })
  })

  describe('findByTaskId', () => {
    it('returns all runs for a task', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)

      repo.create({ task_id: task.id, kind: 'implementer' })
      repo.create({ task_id: task.id, kind: 'spec_review' })
      repo.create({ task_id: task.id, kind: 'code_review' })

      const runs = repo.findByTaskId(task.id)
      expect(runs.length).toBe(3)
      expect(runs.map((r) => r.kind).sort()).toEqual(['code_review', 'implementer', 'spec_review'])
    })

    it('returns empty array when task has no runs', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)
      expect(repo.findByTaskId(task.id)).toEqual([])
    })
  })

  describe('start', () => {
    it('sets started_at and status=running', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)
      const run = repo.create({ task_id: task.id, kind: 'implementer' })

      expect(run.status).toBe('pending')
      expect(run.started_at).toBeNull()

      const started = repo.start(run.id)
      expect(started.status).toBe('running')
      expect(started.started_at).toBeTruthy()
    })
  })

  describe('complete', () => {
    it('sets finished_at, status=completed, and output_ref', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)
      const run = repo.create({ task_id: task.id, kind: 'implementer' })
      repo.start(run.id)

      const completed = repo.complete(run.id, '/path/to/output')
      expect(completed.status).toBe('completed')
      expect(completed.finished_at).toBeTruthy()
      expect(completed.output_ref).toBe('/path/to/output')
    })

    it('completes without output_ref', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)
      const run = repo.create({ task_id: task.id, kind: 'implementer' })

      const completed = repo.complete(run.id)
      expect(completed.status).toBe('completed')
      expect(completed.output_ref).toBeNull()
    })
  })

  describe('fail', () => {
    it('sets finished_at, status=failed, and error_message', () => {
      const task = createTestTask(db)
      const repo = new AgentRunRepository(db)
      const run = repo.create({ task_id: task.id, kind: 'implementer' })
      repo.start(run.id)

      const failed = repo.fail(run.id, 'Something went wrong')
      expect(failed.status).toBe('failed')
      expect(failed.finished_at).toBeTruthy()
      expect(failed.error_message).toBe('Something went wrong')
    })
  })

  describe('foreign key enforcement', () => {
    it('throws when creating a run with non-existent task_id', () => {
      const repo = new AgentRunRepository(db)
      expect(() =>
        repo.create({ task_id: 'nonexistent-task', kind: 'implementer' })
      ).toThrow()
    })
  })
})
