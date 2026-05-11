import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type Database from 'better-sqlite3'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import { TaskRepository } from '../../src/models/task.js'
import { TaskSubrepoRepository } from '../../src/models/task-subrepo.js'

const TEST_DB = path.join(import.meta.dirname, '__test_task_subrepo__.db')
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

function makeTask(database: Database.Database) {
  const project = new ProjectRepository(database).create({
    name: 'Multi-Repo Project',
    slug: 'multi-repo-project',
    local_repo_root: '/home/user/multi-repo',
  })
  const task = new TaskRepository(database).create({
    project_id: project.id,
    title: 'Multi-repo task',
  })
  return { project, task }
}

describe('TaskSubrepoRepository', () => {
  it('creates a subrepo with defaults and retrieves it by id', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    const subrepo = repo.create({
      task_id: task.id,
      repo_path: 'repos/backend',
    })

    expect(subrepo.id).toBeTruthy()
    expect(subrepo.task_id).toBe(task.id)
    expect(subrepo.repo_path).toBe('repos/backend')
    expect(subrepo.branch_name).toBeNull()
    expect(subrepo.worktree_path).toBeNull()
    expect(subrepo.preferred_port).toBeNull()
    expect(subrepo.dev_command).toBeNull()
    expect(subrepo.dev_server_state).toBeNull()
    expect(subrepo.created_at).toBeTruthy()
    expect(subrepo.updated_at).toBeTruthy()

    expect(repo.findById(subrepo.id)).toEqual(subrepo)
  })

  it('persists provided optional fields on create', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    const subrepo = repo.create({
      task_id: task.id,
      repo_path: 'repos/frontend-nextjs',
      branch_name: 'feat/LRCC-2337',
      worktree_path: '/abs/path/.worktrees/LRCC-2337/frontend-nextjs',
      preferred_port: 3001,
      dev_command: 'yarn dev',
      dev_server_state: 'stopped',
    })

    expect(subrepo.branch_name).toBe('feat/LRCC-2337')
    expect(subrepo.worktree_path).toBe(
      '/abs/path/.worktrees/LRCC-2337/frontend-nextjs',
    )
    expect(subrepo.preferred_port).toBe(3001)
    expect(subrepo.dev_command).toBe('yarn dev')
    expect(subrepo.dev_server_state).toBe('stopped')
  })

  it('rejects duplicate (task_id, repo_path)', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    repo.create({ task_id: task.id, repo_path: 'repos/backend' })

    expect(() =>
      repo.create({ task_id: task.id, repo_path: 'repos/backend' }),
    ).toThrow(/UNIQUE/i)
  })

  it('findByTaskId returns rows sorted by repo_path', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    repo.create({ task_id: task.id, repo_path: 'repos/frontend-nextjs' })
    repo.create({ task_id: task.id, repo_path: 'repos/backend' })
    repo.create({ task_id: task.id, repo_path: 'repos/cms' })

    const subrepos = repo.findByTaskId(task.id)
    expect(subrepos.map(s => s.repo_path)).toEqual([
      'repos/backend',
      'repos/cms',
      'repos/frontend-nextjs',
    ])
  })

  it('findByTaskIdAndRepoPath returns null when missing', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    expect(repo.findByTaskIdAndRepoPath(task.id, 'repos/missing')).toBeNull()

    const created = repo.create({ task_id: task.id, repo_path: 'repos/backend' })
    expect(repo.findByTaskIdAndRepoPath(task.id, 'repos/backend')).toEqual(created)
  })

  it('update preserves untouched fields and bumps updated_at', async () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    const initial = repo.create({
      task_id: task.id,
      repo_path: 'repos/backend',
      branch_name: 'feat/foo',
      preferred_port: 3000,
    })

    await new Promise(resolve => setTimeout(resolve, 5))

    const updated = repo.update(initial.id, {
      worktree_path: '/abs/.worktrees/T/backend',
      dev_server_state: 'running',
    })

    expect(updated.branch_name).toBe('feat/foo')
    expect(updated.preferred_port).toBe(3000)
    expect(updated.worktree_path).toBe('/abs/.worktrees/T/backend')
    expect(updated.dev_server_state).toBe('running')
    expect(updated.updated_at >= initial.updated_at).toBe(true)
  })

  it('update can null out fields via explicit null', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)
    const initial = repo.create({
      task_id: task.id,
      repo_path: 'repos/backend',
      worktree_path: '/abs/path',
      preferred_port: 3000,
    })

    const cleared = repo.update(initial.id, {
      worktree_path: null,
      preferred_port: null,
    })

    expect(cleared.worktree_path).toBeNull()
    expect(cleared.preferred_port).toBeNull()
  })

  it('delete removes a single subrepo', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)
    const a = repo.create({ task_id: task.id, repo_path: 'repos/a' })
    const b = repo.create({ task_id: task.id, repo_path: 'repos/b' })

    repo.delete(a.id)

    expect(repo.findById(a.id)).toBeNull()
    expect(repo.findById(b.id)).not.toBeNull()
  })

  it('deleteByTaskId clears all subrepos for one task', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)
    repo.create({ task_id: task.id, repo_path: 'repos/a' })
    repo.create({ task_id: task.id, repo_path: 'repos/b' })

    repo.deleteByTaskId(task.id)

    expect(repo.findByTaskId(task.id)).toHaveLength(0)
  })

  it('defaults created_by_taskhelm to true and persists explicit false', () => {
    const { task } = makeTask(db)
    const repo = new TaskSubrepoRepository(db)

    const defaulted = repo.create({ task_id: task.id, repo_path: 'repos/created' })
    expect(defaulted.created_by_taskhelm).toBe(true)

    const attached = repo.create({
      task_id: task.id,
      repo_path: 'repos/attached',
      created_by_taskhelm: false,
    })
    expect(attached.created_by_taskhelm).toBe(false)
    expect(repo.findById(attached.id)?.created_by_taskhelm).toBe(false)

    const flipped = repo.update(attached.id, { created_by_taskhelm: true })
    expect(flipped.created_by_taskhelm).toBe(true)
  })

  it('cascades on task delete (FK ON DELETE CASCADE)', () => {
    const { task } = makeTask(db)
    const subrepoRepo = new TaskSubrepoRepository(db)
    subrepoRepo.create({ task_id: task.id, repo_path: 'repos/a' })

    new TaskRepository(db).delete(task.id)

    expect(subrepoRepo.findByTaskId(task.id)).toHaveLength(0)
  })
})
