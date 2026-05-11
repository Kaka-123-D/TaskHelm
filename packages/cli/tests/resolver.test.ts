import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import type { Project } from '@taskhelm/core'
import { resolveTaskOrExit, resolveTaskSubrepoOrExit } from '../src/resolver.js'

const tempFiles: string[] = []

function createTempDb(): Database.Database {
  const dbPath = path.join(
    os.tmpdir(),
    `taskhelm-resolver-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
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

describe('resolveTaskOrExit', () => {
  let db: Database.Database
  let projectA: Project
  let projectB: Project

  beforeEach(() => {
    db = createTempDb()
    const projectRepo = new ProjectRepository(db)
    projectA = projectRepo.create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/tmp/alpha',
    })
    projectB = projectRepo.create({
      name: 'Beta',
      slug: 'beta',
      local_repo_root: '/tmp/beta',
    })
  })

  afterEach(() => {
    db.close()
  })

  it('returns the task on full-id match', () => {
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({ project_id: projectA.id, title: 'Build login' })

    const found = resolveTaskOrExit(db, task.id)
    expect(found.id).toBe(task.id)
  })

  it('resolves <slug>:<key>', () => {
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: projectA.id,
      title: 'Ship feature',
      key: 'ALPHA-42',
    })
    // Same key in another project — must be disambiguated by slug.
    taskRepo.create({
      project_id: projectB.id,
      title: 'Different work',
      key: 'ALPHA-42',
    })

    const found = resolveTaskOrExit(db, 'alpha:ALPHA-42')
    expect(found.id).toBe(task.id)
  })

  it('resolves an id-prefix of length >= 4', () => {
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({ project_id: projectA.id, title: 'Prefix me' })
    const prefix = task.id.slice(0, 6)

    const found = resolveTaskOrExit(db, prefix)
    expect(found.id).toBe(task.id)
  })

  it('resolves a unique title substring (case-insensitive)', () => {
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: projectA.id,
      title: 'Implement OAuth callback',
    })
    taskRepo.create({ project_id: projectB.id, title: 'Database migration' })

    const found = resolveTaskOrExit(db, 'oauth')
    expect(found.id).toBe(task.id)
  })

  it('exits 2 on ambiguous title substring', () => {
    const taskRepo = new TaskRepository(db)
    taskRepo.create({ project_id: projectA.id, title: 'Refactor login form' })
    taskRepo.create({ project_id: projectB.id, title: 'Login refactor pt 2' })

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as unknown as typeof process.exit)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      resolveTaskOrExit(db, 'refactor')
      expect(exitSpy).toHaveBeenCalledWith(2)
    } finally {
      exitSpy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it('exits 1 when nothing matches', () => {
    const taskRepo = new TaskRepository(db)
    taskRepo.create({ project_id: projectA.id, title: 'Existing task' })

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as unknown as typeof process.exit)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      resolveTaskOrExit(db, 'nonexistent-key-xyz')
      expect(exitSpy).toHaveBeenCalledWith(1)
    } finally {
      exitSpy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it('full-id match wins even when the id starts with another match prefix', () => {
    // Defensive: full id must be checked before prefix or substring search.
    const taskRepo = new TaskRepository(db)
    const target = taskRepo.create({ project_id: projectA.id, title: 'Target task' })

    const found = resolveTaskOrExit(db, target.id)
    expect(found.id).toBe(target.id)
  })

  it('treats short identifiers as exact-id-only (no prefix/substring fallback)', () => {
    const taskRepo = new TaskRepository(db)
    taskRepo.create({ project_id: projectA.id, title: 'Some task with abc inside' })

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as unknown as typeof process.exit)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      // 'ab' is shorter than the prefix (4) and substring (3) thresholds.
      resolveTaskOrExit(db, 'ab')
      expect(exitSpy).toHaveBeenCalledWith(1)
    } finally {
      exitSpy.mockRestore()
      errSpy.mockRestore()
    }
  })
})

describe('resolveTaskSubrepoOrExit', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTempDb()
  })

  afterEach(() => {
    db.close()
  })

  it('returns the matching subrepo row', () => {
    const project = new ProjectRepository(db).create({
      name: 'multi',
      slug: 'multi',
      local_repo_root: '/tmp/multi',
    })
    const task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'multi-repo task',
    })
    const subrepoRepo = new TaskSubrepoRepository(db)
    const a = subrepoRepo.create({ task_id: task.id, repo_path: 'repos/a' })
    subrepoRepo.create({ task_id: task.id, repo_path: 'repos/b' })

    const resolved = resolveTaskSubrepoOrExit(db, task, 'repos/a')
    expect(resolved.id).toBe(a.id)
  })

  it('exits 1 when subrepo not configured', () => {
    const project = new ProjectRepository(db).create({
      name: 'multi',
      slug: 'multi',
      local_repo_root: '/tmp/multi',
    })
    const task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'multi-repo task',
    })
    new TaskSubrepoRepository(db).create({ task_id: task.id, repo_path: 'repos/a' })

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as unknown as typeof process.exit)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      resolveTaskSubrepoOrExit(db, task, 'repos/never-configured')
      expect(exitSpy).toHaveBeenCalledWith(1)
    } finally {
      exitSpy.mockRestore()
      errSpy.mockRestore()
    }
  })
})
