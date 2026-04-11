import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  AgentRunRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import { runOneCycle } from '../src/loop.js'

const TEST_DB = path.join(import.meta.dirname, '__test_loop__.db')
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

function createTestProject(db: Database.Database) {
  return new ProjectRepository(db).create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: '/home/user/test',
  })
}

function setTaskRunning(db: Database.Database, taskId: string, phase: string) {
  db.prepare(`UPDATE tasks SET status = 'running', phase = ?, updated_at = ? WHERE id = ?`)
    .run(phase, new Date().toISOString(), taskId)
}

describe('runOneCycle', () => {
  it('creates an implementer agent run for a running task in implementation phase', () => {
    const project = createTestProject(db)
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({ project_id: project.id, title: 'Task 1' })
    setTaskRunning(db, task.id, 'implementation')

    const result = runOneCycle(db)

    expect(result.jobsDispatched).toBe(1)

    const updated = taskRepo.findById(task.id)!
    expect(updated.current_agent_run_id).not.toBeNull()

    const agentRunRepo = new AgentRunRepository(db)
    const agentRun = agentRunRepo.findById(updated.current_agent_run_id!)!
    expect(agentRun.kind).toBe('implementer')
    expect(agentRun.status).toBe('running')
  })

  it('advances task phase to spec_review after implementer run completes', () => {
    const project = createTestProject(db)
    const taskRepo = new TaskRepository(db)
    const agentRunRepo = new AgentRunRepository(db)

    const task = taskRepo.create({ project_id: project.id, title: 'Task 2' })
    setTaskRunning(db, task.id, 'implementation')

    // First cycle: dispatch implementer job
    runOneCycle(db)

    const afterDispatch = taskRepo.findById(task.id)!
    const runId = afterDispatch.current_agent_run_id!

    // Manually complete the agent run
    agentRunRepo.complete(runId)

    // Second cycle: should advance phase and clear current_agent_run_id
    runOneCycle(db)

    const afterAdvance = taskRepo.findById(task.id)!
    expect(afterAdvance.phase).toBe('spec_review')
    expect(afterAdvance.current_agent_run_id).toBeNull()
  })

  it('dispatches a spec_review job after phase advances to spec_review', () => {
    const project = createTestProject(db)
    const taskRepo = new TaskRepository(db)
    const agentRunRepo = new AgentRunRepository(db)

    const task = taskRepo.create({ project_id: project.id, title: 'Task 3' })
    setTaskRunning(db, task.id, 'implementation')

    // Cycle 1: dispatch implementer
    runOneCycle(db)
    const run1Id = taskRepo.findById(task.id)!.current_agent_run_id!
    agentRunRepo.complete(run1Id)

    // Cycle 2: advance phase to spec_review, clear run
    runOneCycle(db)

    // Cycle 3: dispatch spec_review job
    const result = runOneCycle(db)
    expect(result.jobsDispatched).toBe(1)

    const updated = taskRepo.findById(task.id)!
    const newRun = agentRunRepo.findById(updated.current_agent_run_id!)!
    expect(newRun.kind).toBe('spec_review')
    expect(newRun.status).toBe('running')
  })

  it('sets task to blocked when agent run fails', () => {
    const project = createTestProject(db)
    const taskRepo = new TaskRepository(db)
    const agentRunRepo = new AgentRunRepository(db)

    const task = taskRepo.create({ project_id: project.id, title: 'Task 4' })
    setTaskRunning(db, task.id, 'implementation')

    // Cycle 1: dispatch implementer
    runOneCycle(db)
    const runId = taskRepo.findById(task.id)!.current_agent_run_id!

    // Mark run as failed
    agentRunRepo.fail(runId, 'Something went wrong')

    // Cycle 2: should mark task as blocked
    runOneCycle(db)

    const blocked = taskRepo.findById(task.id)!
    expect(blocked.status).toBe('blocked')
    expect(blocked.latest_blocker).toBe('Something went wrong')
  })

  it('sets task to done when it reaches final_summary with no pending work', () => {
    const project = createTestProject(db)
    const taskRepo = new TaskRepository(db)
    const agentRunRepo = new AgentRunRepository(db)

    // Put task directly at final_summary with no current run
    const task = taskRepo.create({ project_id: project.id, title: 'Task 5' })
    db.prepare(`UPDATE tasks SET status = 'running', phase = 'final_summary', updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), task.id)

    runOneCycle(db)

    const done = taskRepo.findById(task.id)!
    expect(done.status).toBe('done')
  })

  it('returns eventsProcessed count', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task 6' })
    setTaskRunning(db, task.id, 'implementation')

    const result = runOneCycle(db)
    // One job dispatched means one agent.run.started event
    expect(result.eventsProcessed).toBeGreaterThanOrEqual(1)
  })

  it('returns zero stats when there is nothing to do', () => {
    const result = runOneCycle(db)
    expect(result.jobsDispatched).toBe(0)
    expect(result.eventsProcessed).toBe(0)
  })
})
