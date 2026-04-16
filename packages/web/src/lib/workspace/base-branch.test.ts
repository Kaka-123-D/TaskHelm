import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import {
  assertSafeBranchName,
  RecoverableBaseBranchError,
  currentBranch,
  listAvailableBaseBranches,
  prepareBranchForWorktree,
} from './base-branch'

let repoRoot: string

beforeEach(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-base-branch-'))
  execSync('git init', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: repoRoot, stdio: 'pipe' })
})

afterEach(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true })
})

describe('listAvailableBaseBranches', () => {
  it('includes the current branch name', () => {
    expect(listAvailableBaseBranches(repoRoot)).toContain(currentBranch(repoRoot))
  })
})

describe('prepareBranchForWorktree', () => {
  it('rejects unsupported branch characters before shelling out', () => {
    expect(() => assertSafeBranchName('feature/"bad"')).toThrow(/unsupported characters/i)
  })

  it('creates a missing branch from an explicit base branch', () => {
    const baseBranch = currentBranch(repoRoot)

    prepareBranchForWorktree({
      repoRoot,
      targetBranch: 'feature/new-ui',
      baseBranch,
      autoPull: false,
      forceRefresh: false,
    })

    const branches = execSync('git branch --list "feature/new-ui"', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    expect(branches).toContain('feature/new-ui')
  })

  it('throws a recoverable error when auto-pull fails', () => {
    const baseBranch = currentBranch(repoRoot)

    expect(() =>
      prepareBranchForWorktree({
        repoRoot,
        targetBranch: 'feature/new-ui',
        baseBranch,
        autoPull: true,
        forceRefresh: false,
      }),
    ).toThrow(RecoverableBaseBranchError)
  })
})
