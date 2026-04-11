import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  formatBranchName,
  branchExists,
  listWorktrees,
  createWorktree,
  removeWorktree,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import type { Project, Task } from '@taskhelm/core'

let tmpDir: string
let db: Database.Database
let project: Project
let task: Task

function createTempGitRepo(): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-ws-test-')))
  execSync('git init', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: dir, stdio: 'pipe' })
  return dir
}

beforeEach(() => {
  tmpDir = createTempGitRepo()

  const dbPath = path.join(tmpDir, 'test.db')
  db = createDatabase(dbPath)
  runMigrations(db)

  const projectRepo = new ProjectRepository(db)
  project = projectRepo.create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: tmpDir,
  })

  const taskRepo = new TaskRepository(db)
  task = taskRepo.create({
    project_id: project.id,
    title: 'My Feature Task',
    key: 'FEAT-1',
  })
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('workspace init logic', () => {
  it('formats branch name using default pattern task/{id}', () => {
    const branchName = formatBranchName('task/{id}', { id: task.id, key: task.key })
    expect(branchName).toBe(`task/${task.id.toLowerCase()}`)
  })

  it('creates branch and worktree and updates task in DB', () => {
    const taskRepo = new TaskRepository(db)
    const branchName = formatBranchName('task/{id}', { id: task.id, key: task.key })
    const worktreeRoot = path.join(tmpDir, '.worktrees')
    fs.mkdirSync(worktreeRoot, { recursive: true })

    execSync(`git branch "${branchName}"`, { cwd: tmpDir, stdio: 'pipe' })
    expect(branchExists(tmpDir, branchName)).toBe(true)

    const worktreePath = createWorktree({ repoRoot: tmpDir, worktreeRoot, branchName })
    expect(fs.existsSync(worktreePath)).toBe(true)

    const updated = taskRepo.update(task.id, { branch_name: branchName, worktree_path: worktreePath })
    expect(updated.branch_name).toBe(branchName)
    expect(updated.worktree_path).toBe(worktreePath)

    const worktrees = listWorktrees(tmpDir)
    expect(worktrees).toContain(worktreePath)
  })

  it('uses key-based branch name when project pattern uses {key}', () => {
    const branchName = formatBranchName('feat/{key}', { id: task.id, key: task.key })
    expect(branchName).toBe('feat/feat-1')
  })
})

describe('workspace status logic', () => {
  it('reflects no branch/worktree when task is fresh', () => {
    const taskRepo = new TaskRepository(db)
    const found = taskRepo.findById(task.id)
    expect(found).not.toBeNull()
    expect(found!.branch_name).toBeNull()
    expect(found!.worktree_path).toBeNull()
  })

  it('reflects branch and worktree after update', () => {
    const taskRepo = new TaskRepository(db)
    const updated = taskRepo.update(task.id, {
      branch_name: 'task/abc123',
      worktree_path: '/tmp/some-path',
    })
    expect(updated.branch_name).toBe('task/abc123')
    expect(updated.worktree_path).toBe('/tmp/some-path')
  })
})

describe('workspace cleanup logic', () => {
  it('removes worktree and clears branch_name + worktree_path in DB', () => {
    const taskRepo = new TaskRepository(db)
    const branchName = formatBranchName('task/{id}', { id: task.id, key: task.key })
    const worktreeRoot = path.join(tmpDir, '.worktrees')
    fs.mkdirSync(worktreeRoot, { recursive: true })

    execSync(`git branch "${branchName}"`, { cwd: tmpDir, stdio: 'pipe' })
    const worktreePath = createWorktree({ repoRoot: tmpDir, worktreeRoot, branchName })

    taskRepo.update(task.id, { branch_name: branchName, worktree_path: worktreePath })

    removeWorktree(tmpDir, worktreePath)
    expect(fs.existsSync(worktreePath)).toBe(false)

    const cleared = taskRepo.update(task.id, { branch_name: null, worktree_path: null })
    expect(cleared.branch_name).toBeNull()
    expect(cleared.worktree_path).toBeNull()
  })

  it('preserves the git branch after cleanup', () => {
    const taskRepo = new TaskRepository(db)
    const branchName = formatBranchName('task/{id}', { id: task.id, key: task.key })
    const worktreeRoot = path.join(tmpDir, '.worktrees')
    fs.mkdirSync(worktreeRoot, { recursive: true })

    execSync(`git branch "${branchName}"`, { cwd: tmpDir, stdio: 'pipe' })
    const worktreePath = createWorktree({ repoRoot: tmpDir, worktreeRoot, branchName })
    taskRepo.update(task.id, { branch_name: branchName, worktree_path: worktreePath })

    removeWorktree(tmpDir, worktreePath)
    taskRepo.update(task.id, { branch_name: null, worktree_path: null })

    // Branch should still exist
    expect(branchExists(tmpDir, branchName)).toBe(true)
  })
})
