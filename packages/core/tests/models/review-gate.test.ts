import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import { TaskRepository } from '../../src/models/task.js'
import { ReviewGateRepository } from '../../src/models/review-gate.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_review_gate__.db')
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

describe('ReviewGateRepository', () => {
  describe('create + findById', () => {
    it('creates a review gate and retrieves it by id', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)

      const gate = repo.create({ task_id: task.id, gate_type: 'spec_compliance' })

      expect(gate.id).toBeTruthy()
      expect(gate.task_id).toBe(task.id)
      expect(gate.gate_type).toBe('spec_compliance')
      expect(gate.status).toBe('pending')
      expect(gate.result).toBeNull()
      expect(gate.notes_ref).toBeNull()
      expect(gate.opened_at).toBeNull()
      expect(gate.closed_at).toBeNull()

      const found = repo.findById(gate.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(gate.id)
    })

    it('returns null for unknown id', () => {
      const repo = new ReviewGateRepository(db)
      expect(repo.findById('nonexistent')).toBeNull()
    })
  })

  describe('findByTaskId', () => {
    it('returns all gates for a task', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)

      repo.create({ task_id: task.id, gate_type: 'spec_compliance' })
      repo.create({ task_id: task.id, gate_type: 'code_quality' })
      repo.create({ task_id: task.id, gate_type: 'runtime_verification' })

      const gates = repo.findByTaskId(task.id)
      expect(gates.length).toBe(3)
      expect(gates.map((g) => g.gate_type).sort()).toEqual([
        'code_quality',
        'runtime_verification',
        'spec_compliance',
      ])
    })

    it('returns empty array when task has no gates', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      expect(repo.findByTaskId(task.id)).toEqual([])
    })
  })

  describe('open', () => {
    it('sets status=open and opened_at', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      const gate = repo.create({ task_id: task.id, gate_type: 'spec_compliance' })

      expect(gate.status).toBe('pending')

      const opened = repo.open(gate.id)
      expect(opened.status).toBe('open')
      expect(opened.opened_at).toBeTruthy()
    })
  })

  describe('pass', () => {
    it('sets status=passed, closed_at, and optional result', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      const gate = repo.create({ task_id: task.id, gate_type: 'spec_compliance' })
      repo.open(gate.id)

      const passed = repo.pass(gate.id, 'All checks passed')
      expect(passed.status).toBe('passed')
      expect(passed.closed_at).toBeTruthy()
      expect(passed.result).toBe('All checks passed')
    })

    it('passes without a result', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      const gate = repo.create({ task_id: task.id, gate_type: 'code_quality' })

      const passed = repo.pass(gate.id)
      expect(passed.status).toBe('passed')
      expect(passed.result).toBeNull()
    })
  })

  describe('fail', () => {
    it('sets status=failed, closed_at, and optional result', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      const gate = repo.create({ task_id: task.id, gate_type: 'runtime_verification' })
      repo.open(gate.id)

      const failed = repo.fail(gate.id, 'Tests did not pass')
      expect(failed.status).toBe('failed')
      expect(failed.closed_at).toBeTruthy()
      expect(failed.result).toBe('Tests did not pass')
    })

    it('fails without a result', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      const gate = repo.create({ task_id: task.id, gate_type: 'code_quality' })

      const failed = repo.fail(gate.id)
      expect(failed.status).toBe('failed')
      expect(failed.result).toBeNull()
    })
  })

  describe('UNIQUE(task_id, gate_type) enforcement', () => {
    it('throws when creating a duplicate (task_id, gate_type) combination', () => {
      const task = createTestTask(db)
      const repo = new ReviewGateRepository(db)
      repo.create({ task_id: task.id, gate_type: 'spec_compliance' })

      expect(() =>
        repo.create({ task_id: task.id, gate_type: 'spec_compliance' })
      ).toThrow()
    })

    it('allows same gate_type for different tasks', () => {
      const project = new ProjectRepository(db).create({
        name: 'P',
        slug: 'p',
        local_repo_root: '/p',
      })
      const taskRepo = new TaskRepository(db)
      const task1 = taskRepo.create({ project_id: project.id, title: 'Task 1' })
      const task2 = taskRepo.create({ project_id: project.id, title: 'Task 2' })
      const repo = new ReviewGateRepository(db)

      expect(() => {
        repo.create({ task_id: task1.id, gate_type: 'spec_compliance' })
        repo.create({ task_id: task2.id, gate_type: 'spec_compliance' })
      }).not.toThrow()
    })
  })

  describe('foreign key enforcement', () => {
    it('throws when creating a gate with non-existent task_id', () => {
      const repo = new ReviewGateRepository(db)
      expect(() =>
        repo.create({ task_id: 'nonexistent-task', gate_type: 'spec_compliance' })
      ).toThrow()
    })
  })
})
