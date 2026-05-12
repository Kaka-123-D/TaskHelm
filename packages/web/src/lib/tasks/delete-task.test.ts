import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import {
  createDatabase,
  createWorktree,
  runMigrations,
  DevServerRepository,
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
} from '@taskhelm/core'
import type { Project, Task } from '@taskhelm/core'
import { deleteTaskCascade } from './delete-task'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof createDatabase>
let project: Project

beforeEach(() => {
  tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-delete-task-test-')))
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' })

  dbPath = path.join(tmpDir, 'test.db')
  db = createDatabase(dbPath)
  runMigrations(db)

  const projectRepo = new ProjectRepository(db)
  project = projectRepo.create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: tmpDir,
  })
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function createTaskWithWorktree(branchName: string): { task: Task; worktreePath: string } {
  const taskRepo = new TaskRepository(db)
  let task = taskRepo.create({
    project_id: project.id,
    title: `Task ${branchName}`,
  })
  execSync(`git branch "${branchName}"`, { cwd: tmpDir, stdio: 'pipe' })
  const worktreeRoot = path.join(tmpDir, '.worktrees')
  fs.mkdirSync(worktreeRoot, { recursive: true })
  const worktreePath = createWorktree({ repoRoot: tmpDir, worktreeRoot, branchName })
  task = taskRepo.update(task.id, { branch_name: branchName, worktree_path: worktreePath })
  return { task, worktreePath }
}

describe('deleteTaskCascade', () => {
  it('returns false when the task does not exist', () => {
    const result = deleteTaskCascade(db, 'nonexistent-id')
    expect(result).toBe(false)
  })

  it('deletes the task row and removes its worktree from disk', () => {
    const { task, worktreePath } = createTaskWithWorktree('feat-delete-1')
    expect(fs.existsSync(worktreePath)).toBe(true)

    const result = deleteTaskCascade(db, task.id)
    expect(result).toBe(true)
    expect(fs.existsSync(worktreePath)).toBe(false)
    expect(new TaskRepository(db).findById(task.id)).toBeNull()
  })

  it('lets a future task with the same branch name re-create the worktree', () => {
    // Regression test for the user-reported bug:
    //   xoá 1 task → tạo lại task với branch giống hệt → worktree không tạo được
    // Before the fix, the deleted task left the on-disk worktree + git registry
    // entry behind, so `git worktree add` failed for the next task on the same
    // branch.
    const branchName = 'feat-shared-branch'
    const first = createTaskWithWorktree(branchName)

    deleteTaskCascade(db, first.task.id)

    const taskRepo = new TaskRepository(db)
    const second = taskRepo.create({
      project_id: project.id,
      title: 'Reincarnation',
    })

    const worktreeRoot = path.join(tmpDir, '.worktrees')
    expect(() =>
      createWorktree({ repoRoot: tmpDir, worktreeRoot, branchName })
    ).not.toThrow()

    // The recreated worktree should be at the same path the first one occupied.
    const recreatedPath = path.join(worktreeRoot, 'feat-shared-branch')
    expect(fs.existsSync(recreatedPath)).toBe(true)

    taskRepo.delete(second.id)
  })

  it('still deletes the DB row when the worktree was already manually removed', () => {
    const { task, worktreePath } = createTaskWithWorktree('feat-orphan')
    fs.rmSync(worktreePath, { recursive: true, force: true })

    const result = deleteTaskCascade(db, task.id)
    expect(result).toBe(true)
    expect(new TaskRepository(db).findById(task.id)).toBeNull()
  })

  it('deletes a multi-repo task even when a subrepo still has a dev_servers row', () => {
    // Regression test for the FOREIGN KEY failure shown on task delete:
    //   tasks → ON DELETE CASCADE → task_subrepos, but dev_servers.task_subrepo_id
    //   has no ON DELETE clause, so the cascade fails whenever a subrepo ever
    //   hosted a dev server. deleteTaskCascade must drop the dev_servers row
    //   itself before touching the task.
    const taskRepo = new TaskRepository(db)
    const subrepoRepo = new TaskSubrepoRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const task = taskRepo.create({ project_id: project.id, title: 'multi-repo' })
    const subrepo = subrepoRepo.create({
      task_id: task.id,
      repo_path: 'repos/backend',
      branch_name: null,
      worktree_path: null,
      preferred_port: null,
      dev_command: null,
    })
    devServerRepo.create({
      project_id: project.id,
      task_id: task.id,
      task_subrepo_id: subrepo.id,
      port: 4321,
      status: 'failed',
    })

    const result = deleteTaskCascade(db, task.id)

    expect(result).toBe(true)
    expect(taskRepo.findById(task.id)).toBeNull()
    expect(subrepoRepo.findById(subrepo.id)).toBeNull()
  })
})
