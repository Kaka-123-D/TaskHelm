import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { createWorktree, createBranch } from '@taskhelm/core'
import { currentBranch } from '@/lib/workspace/base-branch'
import { materializeNestedRepoWorktrees } from './nested-worktree'

let repoRoot: string
let worktreeRoot: string
let worktreePath: string

beforeEach(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-nested-worktree-'))
  worktreeRoot = path.join(repoRoot, '.worktrees')
  fs.mkdirSync(worktreeRoot, { recursive: true })

  execSync('git init', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: repoRoot, stdio: 'pipe' })

  const nestedRepo = path.join(repoRoot, 'packages', 'ui')
  fs.mkdirSync(nestedRepo, { recursive: true })
  execSync('git init', { cwd: nestedRepo, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: nestedRepo, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: nestedRepo, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: nestedRepo, stdio: 'pipe' })
  createBranch(nestedRepo, 'feature/ui-worktree')

  createBranch(repoRoot, 'feature/root-worktree')
  worktreePath = createWorktree({
    repoRoot,
    worktreeRoot,
    branchName: 'feature/root-worktree',
  })
})

afterEach(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true })
})

describe('materializeNestedRepoWorktrees', () => {
  it('copies a configured nested repo into the worktree and checks out the requested branch there', () => {
    materializeNestedRepoWorktrees({
      repoRoot,
      worktreePath,
      nestedRepos: [{ repoPath: path.join('packages', 'ui'), branch: 'feature/ui-worktree' }],
    })

    const nestedWorktreeRepo = path.join(worktreePath, 'packages', 'ui')

    expect(fs.existsSync(path.join(nestedWorktreeRepo, '.git'))).toBe(true)
    expect(currentBranch(nestedWorktreeRepo)).toBe('feature/ui-worktree')
  })
})
