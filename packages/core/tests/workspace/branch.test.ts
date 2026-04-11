import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { formatBranchName, createBranch, branchExists } from '../../src/workspace/branch.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-branch-test-'))
  execSync('git init', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('formatBranchName', () => {
  it('replaces {key} when task has a key', () => {
    const result = formatBranchName('feat/{key}', { id: 'abc123', key: 'TASK-42' })
    expect(result).toBe('feat/task-42')
  })

  it('falls back to {id} when task has no key and pattern uses {key}', () => {
    const result = formatBranchName('feat/{key}', { id: 'abc123', key: null })
    expect(result).toBe('feat/abc123')
  })

  it('replaces {id} with the task id', () => {
    const result = formatBranchName('task/{id}', { id: 'xyz789', key: 'TASK-1' })
    expect(result).toBe('task/xyz789')
  })

  it('sanitizes spaces to hyphens', () => {
    const result = formatBranchName('feat/{key}', { id: 'abc', key: 'my task name' })
    expect(result).toBe('feat/my-task-name')
  })

  it('sanitizes special characters except / - _', () => {
    const result = formatBranchName('feat/{key}', { id: 'abc', key: 'task!@#$%^&*()' })
    expect(result).toBe('feat/task')
  })

  it('converts to lowercase', () => {
    const result = formatBranchName('FEAT/{key}', { id: 'abc', key: 'MyTask' })
    expect(result).toBe('feat/mytask')
  })
})

describe('createBranch + branchExists', () => {
  it('creates a new branch from HEAD', () => {
    createBranch(tmpDir, 'feature/new-branch')
    expect(branchExists(tmpDir, 'feature/new-branch')).toBe(true)
  })

  it('creates a branch from a specified base branch', () => {
    // Detect the default branch name (git init may use 'main' or 'master')
    const defaultBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()
    createBranch(tmpDir, 'feature/based-branch', defaultBranch)
    expect(branchExists(tmpDir, 'feature/based-branch')).toBe(true)
  })

  it('returns false for a non-existent branch', () => {
    expect(branchExists(tmpDir, 'nonexistent-branch')).toBe(false)
  })

  it('throws an error if branch name is invalid', () => {
    expect(() => createBranch(tmpDir, '')).toThrow()
  })

  it('throws if base branch does not exist', () => {
    expect(() => createBranch(tmpDir, 'new-branch', 'nonexistent-base')).toThrow()
  })
})
