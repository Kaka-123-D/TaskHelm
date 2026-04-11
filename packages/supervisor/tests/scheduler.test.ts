import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository, AgentRunRepository } from '@taskhelm/core'
import type Database from 'better-sqlite3'
import { getSchedulableJobs } from '../src/scheduler.js'

const TEST_DB = path.join(import.meta.dirname, '__test_scheduler__.db')
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

describe('getSchedulableJobs', () => {
  it('returns implementer job for running task in implementation phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task A' })
    setTaskRunning(db, task.id, 'implementation')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].taskId).toBe(task.id)
    expect(jobs[0].kind).toBe('implementer')
  })

  it('returns spec_review job for running task in spec_review phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task B' })
    setTaskRunning(db, task.id, 'spec_review')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].kind).toBe('spec_review')
  })

  it('returns code_review job for running task in code_review phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task C' })
    setTaskRunning(db, task.id, 'code_review')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].kind).toBe('code_review')
  })

  it('returns runtime_verify job for running task in runtime_verification phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task D' })
    setTaskRunning(db, task.id, 'runtime_verification')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].kind).toBe('runtime_verify')
  })

  it('returns no job for running task in context phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task E' })
    setTaskRunning(db, task.id, 'context')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(0)
  })

  it('returns no job for running task in planning phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task F' })
    setTaskRunning(db, task.id, 'planning')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(0)
  })

  it('returns no job for running task in final_summary phase', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task G' })
    setTaskRunning(db, task.id, 'final_summary')

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(0)
  })

  it('returns no job for task with an active running agent run', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task H' })
    setTaskRunning(db, task.id, 'implementation')

    const agentRun = new AgentRunRepository(db).create({ task_id: task.id, kind: 'implementer' })
    new AgentRunRepository(db).start(agentRun.id)
    new TaskRepository(db).update(task.id, { current_agent_run_id: agentRun.id })

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(0)
  })

  it('returns job for task whose agent run is completed (run cleared)', () => {
    const project = createTestProject(db)
    const task = new TaskRepository(db).create({ project_id: project.id, title: 'Task I' })
    setTaskRunning(db, task.id, 'implementation')

    // Agent run completed but current_agent_run_id already cleared
    const agentRun = new AgentRunRepository(db).create({ task_id: task.id, kind: 'implementer' })
    new AgentRunRepository(db).complete(agentRun.id)
    // current_agent_run_id is null (not set)

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].kind).toBe('implementer')
  })

  it('returns no job for task in draft status', () => {
    const project = createTestProject(db)
    // Tasks default to draft status
    new TaskRepository(db).create({ project_id: project.id, title: 'Task J' })

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(0)
  })

  it('returns multiple jobs for multiple eligible tasks', () => {
    const project = createTestProject(db)
    const taskRepo = new TaskRepository(db)

    const taskA = taskRepo.create({ project_id: project.id, title: 'Task AA' })
    setTaskRunning(db, taskA.id, 'implementation')

    const taskB = taskRepo.create({ project_id: project.id, title: 'Task BB' })
    setTaskRunning(db, taskB.id, 'spec_review')

    const taskC = taskRepo.create({ project_id: project.id, title: 'Task CC' })
    setTaskRunning(db, taskC.id, 'context') // no job for context

    const jobs = getSchedulableJobs(db)
    expect(jobs).toHaveLength(2)

    const kinds = jobs.map((j) => j.kind).sort()
    expect(kinds).toEqual(['implementer', 'spec_review'])
  })
})
