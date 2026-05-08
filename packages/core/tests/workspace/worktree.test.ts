import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import {
  createWorktree,
  removeWorktree,
  listWorktrees,
  canonicalWorktreePath,
  isWithinDir,
  getWorktreeBranch,
} from '../../src/workspace/worktree.js'

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

  it('falls back to prune when the worktree directory was already removed manually', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })
    // Simulate `rm -rf` on the worktree dir without using `git worktree remove`.
    fs.rmSync(worktreePath, { recursive: true, force: true })
    expect(fs.existsSync(worktreePath)).toBe(false)

    // Should NOT throw — should prune the stale registry entry instead.
    expect(() => removeWorktree(tmpDir, worktreePath)).not.toThrow()
    expect(listWorktrees(tmpDir)).not.toContain(worktreePath)
  })
})

describe('createWorktree resilience', () => {
  it('recreates a worktree at the same path after the directory was rm -rf-ed', () => {
    // User flow that broke before the prune-first fix:
    //   1. createWorktree → worktree on disk + registered
    //   2. rm -rf <path> directly (no `git worktree remove`)
    //   3. createWorktree at the same path again
    // Without prune, step 3 fails: "fatal: '<path>' is a missing but locked
    // working tree" or "branch 'X' is already checked out at '<path>'".
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })
    fs.rmSync(worktreePath, { recursive: true, force: true })

    const recreated = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })
    expect(recreated).toBe(worktreePath)
    expect(fs.existsSync(recreated)).toBe(true)
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

describe('canonicalWorktreePath', () => {
  it('returns the realpath when the path exists (resolves symlinks)', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })
    const symlinkPath = path.join(tmpDir, 'wt-symlink')
    fs.symlinkSync(worktreePath, symlinkPath)

    expect(canonicalWorktreePath(symlinkPath)).toBe(worktreePath)
  })

  it('returns a resolved path even when the target does not exist', () => {
    const ghost = path.join(tmpDir, 'nope', '..', 'still-nope')
    expect(canonicalWorktreePath(ghost)).toBe(path.resolve(tmpDir, 'still-nope'))
  })
})

describe('isWithinDir', () => {
  it('returns true when candidate is a strict descendant', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })
    expect(isWithinDir(worktreeRoot, worktreePath)).toBe(true)
  })

  it('returns false when candidate is the dir itself or outside', () => {
    expect(isWithinDir(worktreeRoot, worktreeRoot)).toBe(false)
    expect(isWithinDir(worktreeRoot, tmpDir)).toBe(false)
  })
})

describe('getWorktreeBranch', () => {
  it('returns the branch name checked out in a worktree', () => {
    const worktreePath = createWorktree({
      repoRoot: tmpDir,
      worktreeRoot,
      branchName: 'feature-test',
    })
    expect(getWorktreeBranch(worktreePath)).toBe('feature-test')
  })
})
