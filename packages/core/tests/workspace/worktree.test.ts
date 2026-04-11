import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { createWorktree, removeWorktree, listWorktrees } from '../../src/workspace/worktree.js'

let tmpDir: string
let worktreeRoot: string

beforeEach(() => {
  // Use realpathSync to resolve macOS /var -> /private/var symlink
  tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-worktree-test-')))
  worktreeRoot = path.join(tmpDir, '.worktrees')
  fs.mkdirSync(worktreeRoot)

  execSync('git init', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' })
  // Create a branch to use for worktree
  execSync('git branch feature-test', { cwd: tmpDir, stdio: 'pipe' })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('createWorktree', () => {
  it('creates a worktree at the expected path and returns the path', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })

    expect(worktreePath).toBe(path.join(worktreeRoot, 'feature-test'))
    expect(fs.existsSync(worktreePath)).toBe(true)
  })

  it('sanitizes branch name in the worktree directory path', () => {
    execSync('git branch feat/my-feature', { cwd: tmpDir, stdio: 'pipe' })
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feat/my-feature',
    })

    expect(fs.existsSync(worktreePath)).toBe(true)
    // Directory name should not contain slash
    const dirName = path.basename(worktreePath)
    expect(dirName).not.toContain('/')
  })
})

describe('removeWorktree', () => {
  it('removes an existing worktree', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })

    expect(fs.existsSync(worktreePath)).toBe(true)
    removeWorktree(tmpDir, worktreePath)
    expect(fs.existsSync(worktreePath)).toBe(false)
  })

  it('throws an error if the worktree path does not exist', () => {
    expect(() => removeWorktree(tmpDir, path.join(worktreeRoot, 'nonexistent'))).toThrow()
  })
})

describe('listWorktrees', () => {
  it('returns at least the main worktree', () => {
    const worktrees = listWorktrees(tmpDir)
    expect(worktrees.length).toBeGreaterThanOrEqual(1)
    expect(worktrees[0]).toBe(tmpDir)
  })

  it('includes created worktrees in the list', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })

    const worktrees = listWorktrees(tmpDir)
    expect(worktrees).toContain(worktreePath)
  })
})
