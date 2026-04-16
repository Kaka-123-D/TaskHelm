import { execSync } from 'node:child_process'
import { branchExists, createBranch } from '@taskhelm/core'

interface PrepareBranchForWorktreeConfig {
  readonly repoRoot: string
  readonly targetBranch: string
  readonly baseBranch: string
  readonly autoPull: boolean
  readonly forceRefresh: boolean
}

export class RecoverableBaseBranchError extends Error {
  readonly code = 'BASE_BRANCH_PULL_FAILED'
  readonly canForceRefresh = true
}

const SAFE_BRANCH_NAME = /^[A-Za-z0-9._/-]+$/

function trim(value: string): string {
  return value.trim()
}

export function assertSafeBranchName(branchName: string): string {
  const normalized = trim(branchName)
  if (!SAFE_BRANCH_NAME.test(normalized)) {
    throw new Error('Branch name contains unsupported characters')
  }

  return normalized
}

function remoteBranchExists(repoRoot: string, branchName: string): boolean {
  try {
    const output = execSync(`git branch -r --list "origin/${branchName}"`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
    return output.toString().trim().length > 0
  } catch {
    return false
  }
}

function fetchOriginBranch(repoRoot: string, branchName: string): void {
  execSync(`git fetch origin "${branchName}"`, {
    cwd: repoRoot,
    stdio: 'pipe',
  })
}

export function currentBranch(repoRoot: string): string {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: repoRoot,
    stdio: 'pipe',
  })
    .toString()
    .trim()
}

export function listAvailableBaseBranches(repoRoot: string): readonly string[] {
  const names = new Set<string>()

  const addOutput = (output: string) => {
    for (const line of output.split('\n')) {
      const branchName = trim(line)
      if (!branchName || branchName === 'origin/HEAD') {
        continue
      }

      names.add(branchName.replace(/^origin\//, ''))
    }
  }

  addOutput(
    execSync('git for-each-ref --format="%(refname:short)" refs/heads', {
      cwd: repoRoot,
      stdio: 'pipe',
    }).toString(),
  )

  try {
    addOutput(
      execSync('git for-each-ref --format="%(refname:short)" refs/remotes/origin', {
        cwd: repoRoot,
        stdio: 'pipe',
      }).toString(),
    )
  } catch {
    // No remote is configured yet.
  }

  return [...names].sort((left, right) => left.localeCompare(right))
}

export function prepareBranchForWorktree({
  repoRoot,
  targetBranch,
  baseBranch,
  autoPull,
  forceRefresh,
}: PrepareBranchForWorktreeConfig): void {
  const normalizedTargetBranch = assertSafeBranchName(targetBranch)
  const normalizedBaseBranch = assertSafeBranchName(baseBranch)

  if (branchExists(repoRoot, normalizedTargetBranch)) {
    return
  }

  if (remoteBranchExists(repoRoot, normalizedTargetBranch)) {
    createBranch(repoRoot, normalizedTargetBranch, `origin/${normalizedTargetBranch}`)
    return
  }

  let createFromRef = normalizedBaseBranch

  if (autoPull || forceRefresh) {
    try {
      fetchOriginBranch(repoRoot, normalizedBaseBranch)
      if (remoteBranchExists(repoRoot, normalizedBaseBranch)) {
        createFromRef = `origin/${normalizedBaseBranch}`
      }
    } catch (error) {
      if (forceRefresh) {
        throw new Error(
          `Failed to force refresh base branch "${normalizedBaseBranch}": ${(error as Error).message}`,
        )
      }

      throw new RecoverableBaseBranchError(
        `Failed to pull base branch "${normalizedBaseBranch}" before creating "${normalizedTargetBranch}".`,
      )
    }
  } else if (!branchExists(repoRoot, normalizedBaseBranch) && remoteBranchExists(repoRoot, normalizedBaseBranch)) {
    createFromRef = `origin/${normalizedBaseBranch}`
  }

  if (createFromRef === normalizedBaseBranch && !branchExists(repoRoot, normalizedBaseBranch)) {
    throw new Error(`Base branch "${normalizedBaseBranch}" does not exist`)
  }

  createBranch(repoRoot, normalizedTargetBranch, createFromRef)
}
