import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  AgentRunRepository,
  DevServerRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import { recoverOnStartup } from '../src/recovery.js'

const TEST_DB = path.join(import.meta.dirname, '__test_recovery__.db')
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

function createTestProject(database: Database.Database) {
  return new ProjectRepository(database).create({
    name: 'Recovery Test Project',
    slug: 'recovery-test',
    local_repo_root: '/home/user/recovery-test',
  })
}

describe('recoverOnStartup', () => {
  describe('dev server recovery', () => {
    it('marks a running server with a dead PID as failed', () => {
      const project = createTestProject(db)
      const serverRepo = new DevServerRepository(db)

      const server = serverRepo.create({
        project_id: project.id,
        port: 4000,
        status: 'running',
      })

      // Set a dead PID — PID 1 is always alive (init/launchd), so use a
      // clearly invalid PID that does not exist
      const deadPid = 999999999
      db.prepare(`UPDATE dev_servers SET pid = ? WHERE id = ?`).run(deadPid, server.id)

      const result = recoverOnStartup(db)

      expect(result.repairedServers).toBe(1)
      const updated = serverRepo.findById(server.id)!
      expect(updated.status).toBe('failed')
    })

    it('marks a starting server with a dead PID as failed', () => {
      const project = createTestProject(db)
      const serverRepo = new DevServerRepository(db)

      const server = serverRepo.create({
        project_id: project.id,
        port: 4001,
        status: 'starting',
      })

      const deadPid = 999999998
      db.prepare(`UPDATE dev_servers SET pid = ? WHERE id = ?`).run(deadPid, server.id)

      const result = recoverOnStartup(db)

      expect(result.repairedServers).toBe(1)
      const updated = serverRepo.findById(server.id)!
      expect(updated.status).toBe('failed')
    })

    it('marks a server with null PID (never started) as failed', () => {
      const project = createTestProject(db)
      const serverRepo = new DevServerRepository(db)

      // Server in 'running' state but no PID — was never properly started
      const server = serverRepo.create({
        project_id: project.id,
        port: 4002,
        status: 'running',
      })
      // pid is null by default from create()

      const result = recoverOnStartup(db)

      expect(result.repairedServers).toBe(1)
      const updated = serverRepo.findById(server.id)!
      expect(updated.status).toBe('failed')
    })

    it('leaves a server with a live PID untouched', () => {
      const project = createTestProject(db)
      const serverRepo = new DevServerRepository(db)

      const server = serverRepo.create({
        project_id: project.id,
        port: 4003,
        status: 'running',
      })

      // Use the current process PID — guaranteed to be alive
      db.prepare(`UPDATE dev_servers SET pid = ? WHERE id = ?`).run(process.pid, server.id)

      const result = recoverOnStartup(db)

      expect(result.repairedServers).toBe(0)
      const updated = serverRepo.findById(server.id)!
      expect(updated.status).toBe('running')
    })

    it('ignores servers in stopped/warm/sleeping states', () => {
      const project = createTestProject(db)
      const serverRepo = new DevServerRepository(db)

      const stopped = serverRepo.create({ project_id: project.id, port: 4010, status: 'stopped' })

      const result = recoverOnStartup(db)

      expect(result.repairedServers).toBe(0)
      expect(serverRepo.findById(stopped.id)!.status).toBe('stopped')
    })
  })

  describe('agent run recovery', () => {
    it('marks a running agent run as failed with "Supervisor restarted"', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Recovery Task' })
      db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), task.id)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      agentRunRepo.start(run.id)

      // Confirm it's running
      expect(agentRunRepo.findById(run.id)!.status).toBe('running')

      const result = recoverOnStartup(db)

      expect(result.repairedRuns).toBe(1)

      const updated = agentRunRepo.findById(run.id)!
      expect(updated.status).toBe('failed')
      expect(updated.error_message).toBe('Supervisor restarted')
      expect(updated.finished_at).not.toBeNull()
    })

    it('makes the task dispatchable again after its run is failed', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Resumable Task' })
      db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`)
        .run(new Date().toISOString(), task.id)

      const run = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      agentRunRepo.start(run.id)
      taskRepo.update(task.id, { current_agent_run_id: run.id })

      recoverOnStartup(db)

      const recovered = taskRepo.findById(task.id)!
      expect(recovered.status).toBe('running')
      expect(recovered.current_agent_run_id).toBeNull()
    })

    it('does not touch completed or pending agent runs', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Untouched Task' })

      const pending = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
      const completed = agentRunRepo.create({ task_id: task.id, kind: 'spec_review' })
      agentRunRepo.start(completed.id)
      agentRunRepo.complete(completed.id)

      const result = recoverOnStartup(db)

      expect(result.repairedRuns).toBe(0)
      expect(agentRunRepo.findById(pending.id)!.status).toBe('pending')
      expect(agentRunRepo.findById(completed.id)!.status).toBe('completed')
    })

    it('handles multiple interrupted runs across different tasks', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)

      const task1 = taskRepo.create({ project_id: project.id, title: 'Task A' })
      const task2 = taskRepo.create({ project_id: project.id, title: 'Task B' })

      for (const task of [task1, task2]) {
        db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`)
          .run(new Date().toISOString(), task.id)
        const run = agentRunRepo.create({ task_id: task.id, kind: 'implementer' })
        agentRunRepo.start(run.id)
        taskRepo.update(task.id, { current_agent_run_id: run.id })
      }

      const result = recoverOnStartup(db)

      expect(result.repairedRuns).toBe(2)

      for (const task of [task1, task2]) {
        const recovered = taskRepo.findById(task.id)!
        expect(recovered.current_agent_run_id).toBeNull()
        expect(recovered.status).toBe('running')
      }
    })
  })

  describe('clean state', () => {
    it('returns zeros when there is nothing to repair', () => {
      const result = recoverOnStartup(db)
      expect(result.repairedServers).toBe(0)
      expect(result.repairedRuns).toBe(0)
    })
  })
})
