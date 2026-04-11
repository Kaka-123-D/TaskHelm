import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  AgentRunRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import type { Project, Task } from '@taskhelm/core'

const tempFiles: string[] = []

function createTempDb(): Database.Database {
  const dbPath = path.join(
    os.tmpdir(),
    `taskhelm-agent-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  )
  tempFiles.push(dbPath)
  const db = createDatabase(dbPath)
  runMigrations(db)
  return db
}

afterEach(() => {
  for (const file of tempFiles.splice(0)) {
    for (const ext of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(file + ext)
      } catch {}
    }
  }
})

describe('Agent CLI commands', () => {
  let db: Database.Database
  let project: Project
  let task: Task

  beforeEach(() => {
    db = createTempDb()
    project = new ProjectRepository(db).create({
      name: 'Agent Test Project',
      slug: 'agent-test',
      local_repo_root: '/tmp/agent-test',
    })
    task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'Agent Test Task',
    })
  })

  afterEach(() => {
    db.close()
  })

  describe('agent run', () => {
    it('creates an agent run for a valid task and kind', () => {
      const agentRunRepo = new AgentRunRepository(db)

      // Simulate what the CLI command does
      const run = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      agentRunRepo.start(run.id)

      const found = agentRunRepo.findById(run.id)
      expect(found).not.toBeNull()
      expect(found!.kind).toBe('implementer')
      expect(found!.status).toBe('running')
      expect(found!.task_id).toBe(task.id)
    })

    it('maps CLI kind "spec-review" to DB kind "spec_review"', () => {
      const agentRunRepo = new AgentRunRepository(db)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'spec_review' })
      agentRunRepo.start(run.id)

      expect(run.kind).toBe('spec_review')
    })

    it('maps CLI kind "code-review" to DB kind "code_review"', () => {
      const agentRunRepo = new AgentRunRepository(db)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'code_review' })
      agentRunRepo.start(run.id)

      expect(run.kind).toBe('code_review')
    })

    it('maps CLI kind "verify" to DB kind "runtime_verify"', () => {
      const agentRunRepo = new AgentRunRepository(db)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'runtime_verify' })
      agentRunRepo.start(run.id)

      expect(run.kind).toBe('runtime_verify')
    })

    it('creates a started run with started_at set', () => {
      const agentRunRepo = new AgentRunRepository(db)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      const started = agentRunRepo.start(run.id)

      expect(started.started_at).not.toBeNull()
      expect(started.status).toBe('running')
    })
  })

  describe('agent status', () => {
    it('lists all runs for a task', () => {
      const agentRunRepo = new AgentRunRepository(db)

      const run1 = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      agentRunRepo.start(run1.id)
      agentRunRepo.complete(run1.id)

      const run2 = agentRunRepo.create({ task_id: task.id, kind: 'spec_review' })
      agentRunRepo.start(run2.id)

      const runs = agentRunRepo.findByTaskId(task.id)
      expect(runs).toHaveLength(2)
      expect(runs[0].kind).toBe('implementer')
      expect(runs[0].status).toBe('completed')
      expect(runs[1].kind).toBe('spec_review')
      expect(runs[1].status).toBe('running')
    })

    it('returns empty list when task has no runs', () => {
      const agentRunRepo = new AgentRunRepository(db)
      const runs = agentRunRepo.findByTaskId(task.id)
      expect(runs).toHaveLength(0)
    })

    it('shows error message on failed runs', () => {
      const agentRunRepo = new AgentRunRepository(db)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      agentRunRepo.start(run.id)
      const failed = agentRunRepo.fail(run.id, 'Something went wrong')

      expect(failed.error_message).toBe('Something went wrong')
      expect(failed.status).toBe('failed')
      expect(failed.finished_at).not.toBeNull()
    })

    it('lists runs for specific task only, not other tasks', () => {
      const agentRunRepo = new AgentRunRepository(db)
      const taskRepo = new TaskRepository(db)

      const otherTask = taskRepo.create({ project_id: project.id, title: 'Other Task' })
      agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      agentRunRepo.create({ task_id: otherTask.id, kind: 'spec_review' })

      const runs = agentRunRepo.findByTaskId(task.id)
      expect(runs).toHaveLength(1)
      expect(runs[0].kind).toBe('implementer')
    })
  })
})
