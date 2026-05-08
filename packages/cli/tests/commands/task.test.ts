import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import type { Project, Task } from '@taskhelm/core'

const tempFiles: string[] = []

function createTempDb(): { db: Database.Database; dbPath: string } {
  const dbPath = path.join(
    os.tmpdir(),
    `taskhelm-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  )
  tempFiles.push(dbPath)
  const db = createDatabase(dbPath)
  runMigrations(db)
  return { db, dbPath }
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

describe('Task CLI commands', () => {
  let db: Database.Database
  let project: Project

  beforeEach(() => {
    const result = createTempDb()
    db = result.db
    const projectRepo = new ProjectRepository(db)
    project = projectRepo.create({
      name: 'Test Project',
      slug: 'test-project',
      local_repo_root: '/tmp/test-project',
    })
  })

  afterEach(() => {
    db.close()
  })

  describe('task create', () => {
    it('creates a task with required fields', () => {
      const taskRepo = new TaskRepository(db)
      const task = taskRepo.create({
        project_id: project.id,
        title: 'My First Task',
      })

      expect(task.id).toBeTruthy()
      expect(task.title).toBe('My First Task')
      expect(task.project_id).toBe(project.id)
      expect(task.priority).toBe(0)
    })

    it('creates a task with all optional fields', () => {
      const taskRepo = new TaskRepository(db)
      const task = taskRepo.create({
        project_id: project.id,
        title: 'Full Task',
        goal: 'Accomplish great things',
        key: 'TASK-42',
        refer_link: 'https://github.com/org/repo/issues/42',
        priority: 5,
      })

      expect(task.goal).toBe('Accomplish great things')
      expect(task.key).toBe('TASK-42')
      expect(task.refer_link).toBe('https://github.com/org/repo/issues/42')
      expect(task.priority).toBe(5)
    })

  })

  describe('task list', () => {
    it('returns empty array when no tasks for project', () => {
      const taskRepo = new TaskRepository(db)
      expect(taskRepo.findByProjectId(project.id)).toEqual([])
    })

    it('returns tasks filtered by project', () => {
      const projectRepo = new ProjectRepository(db)
      const taskRepo = new TaskRepository(db)

      const otherProject = projectRepo.create({
        name: 'Other Project',
        slug: 'other-project',
        local_repo_root: '/tmp/other',
      })

      taskRepo.create({ project_id: project.id, title: 'My Task' })
      taskRepo.create({ project_id: otherProject.id, title: 'Other Task' })

      const myTasks = taskRepo.findByProjectId(project.id)
      expect(myTasks.length).toBe(1)
      expect(myTasks[0].title).toBe('My Task')

      const otherTasks = taskRepo.findByProjectId(otherProject.id)
      expect(otherTasks.length).toBe(1)
      expect(otherTasks[0].title).toBe('Other Task')
    })

    it('returns all tasks without legacy status filtering', () => {
      const taskRepo = new TaskRepository(db)

      const draft = taskRepo.create({ project_id: project.id, title: 'Draft Task' })
      const runtime = taskRepo.create({ project_id: project.id, title: 'Runtime Task' })
      taskRepo.update(runtime.id, { port: 3100, dev_server_state: 'running' })

      const allTasks = taskRepo.findByProjectId(project.id)
      expect(allTasks).toHaveLength(2)
      expect(allTasks.map((task) => task.id).sort()).toEqual([draft.id, runtime.id].sort())
    })
  })

  describe('task show', () => {
    it('finds a task by id', () => {
      const taskRepo = new TaskRepository(db)
      const task = taskRepo.create({ project_id: project.id, title: 'Show Task' })

      const found = taskRepo.findById(task.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(task.id)
      expect(found!.title).toBe('Show Task')
    })

    it('returns null for unknown id', () => {
      const taskRepo = new TaskRepository(db)
      expect(taskRepo.findById('nonexistent-id')).toBeNull()
    })

  })
})
