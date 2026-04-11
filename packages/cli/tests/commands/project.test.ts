import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'
import type Database from 'better-sqlite3'

const tempFiles: string[] = []

function createTempDb(): { db: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `taskhelm-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
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

describe('ProjectRepository via CLI helpers', () => {
  let db: Database.Database

  beforeEach(() => {
    const result = createTempDb()
    db = result.db
  })

  afterEach(() => {
    db.close()
  })

  describe('project create', () => {
    it('creates a project with required fields', () => {
      const repo = new ProjectRepository(db)
      const project = repo.create({
        name: 'Test Project',
        slug: 'test-project',
        local_repo_root: '/tmp/test-project',
      })

      expect(project.id).toBeTruthy()
      expect(project.name).toBe('Test Project')
      expect(project.slug).toBe('test-project')
      expect(project.local_repo_root).toBe('/tmp/test-project')
      expect(project.description).toBeNull()
      expect(project.specdown_mode).toBe('disabled')
    })

    it('creates a project with all optional fields', () => {
      const repo = new ProjectRepository(db)
      const project = repo.create({
        name: 'Full Project',
        slug: 'full-project',
        local_repo_root: '/tmp/full-project',
        description: 'A full description',
        default_branch: 'main',
        dev_command: 'pnpm dev',
        install_command: 'pnpm install',
        test_command: 'pnpm test',
      })

      expect(project.description).toBe('A full description')
      expect(project.default_branch).toBe('main')
      expect(project.dev_command).toBe('pnpm dev')
      expect(project.install_command).toBe('pnpm install')
      expect(project.test_command).toBe('pnpm test')
    })
  })

  describe('project list', () => {
    it('returns empty array when no projects exist', () => {
      const repo = new ProjectRepository(db)
      expect(repo.findAll()).toEqual([])
    })

    it('returns all created projects', () => {
      const repo = new ProjectRepository(db)
      repo.create({ name: 'Alpha', slug: 'alpha', local_repo_root: '/tmp/alpha' })
      repo.create({ name: 'Beta', slug: 'beta', local_repo_root: '/tmp/beta' })

      const all = repo.findAll()
      expect(all.length).toBe(2)
      expect(all.map((p) => p.slug).sort()).toEqual(['alpha', 'beta'])
    })

    it('returns correct task count per project', () => {
      const projectRepo = new ProjectRepository(db)
      const taskRepo = new TaskRepository(db)

      const project = projectRepo.create({ name: 'Counted', slug: 'counted', local_repo_root: '/tmp/counted' })
      taskRepo.create({ project_id: project.id, title: 'Task 1' })
      taskRepo.create({ project_id: project.id, title: 'Task 2' })

      const tasks = taskRepo.findByProjectId(project.id)
      expect(tasks.length).toBe(2)
    })
  })

  describe('project show', () => {
    it('finds a project by slug', () => {
      const repo = new ProjectRepository(db)
      const created = repo.create({ name: 'Show Me', slug: 'show-me', local_repo_root: '/tmp/show-me' })

      const found = repo.findBySlug('show-me')
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.name).toBe('Show Me')
    })

    it('returns null for unknown slug', () => {
      const repo = new ProjectRepository(db)
      expect(repo.findBySlug('no-such-slug')).toBeNull()
    })

    it('returns correct active task count', () => {
      const projectRepo = new ProjectRepository(db)
      const taskRepo = new TaskRepository(db)

      const project = projectRepo.create({ name: 'Active Tasks', slug: 'active-tasks', local_repo_root: '/tmp/active' })
      taskRepo.create({ project_id: project.id, title: 'Draft Task' })
      const running = taskRepo.create({ project_id: project.id, title: 'Running Task' })
      taskRepo.updateStatus(running.id, 'running')

      const tasks = taskRepo.findByProjectId(project.id)
      const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'reviewing')
      expect(activeTasks.length).toBe(1)
    })
  })
})
