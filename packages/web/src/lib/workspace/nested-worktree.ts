import * as fs from 'node:fs'
import * as path from 'node:path'
import { createWorktree } from '@taskhelm/core'
import { currentBranch, prepareBranchForWorktree } from '@/lib/workspace/base-branch'

interface CreateSubrepoWorktreeConfig {
  /** Absolute path to the nested repo's source (where `.git/` lives). */
  readonly nestedRepoAbsPath: string
  /** Absolute path where the worktree should land. */
  readonly targetPath: string
  /** Branch to check out in the new worktree. */
  readonly branchName: string
  /** Base branch to create from when `branchName` does not yet exist. */
  readonly baseBranch?: string
  /** Whether to fetch origin/<baseBranch> before creating the new branch. */
  readonly autoPull?: boolean
}

/**
 * Materialize one nested-repo worktree using `git worktree add` against the
 * nested repo. Replaces the legacy `git clone` approach, which doubled disk
 * usage and broke the worktree registry on the source nested repo.
 *
 * Pre-conditions:
 *   - `nestedRepoAbsPath` is an absolute path to a directory whose `.git/`
 *     identifies a real git repository.
 *   - `targetPath` does not yet exist (or has been cleaned up by the caller).
 */
export function createSubrepoWorktree({
  nestedRepoAbsPath,
  targetPath,
  branchName,
  baseBranch,
  autoPull = false,
}: CreateSubrepoWorktreeConfig): string {
  const resolvedBaseBranch = baseBranch ?? currentBranch(nestedRepoAbsPath)

  prepareBranchForWorktree({
    repoRoot: nestedRepoAbsPath,
    targetBranch: branchName,
    baseBranch: resolvedBaseBranch,
    autoPull,
    forceRefresh: false,
  })

  const targetParent = path.dirname(targetPath)
  fs.mkdirSync(targetParent, { recursive: true })

  return createWorktree({
    repoRoot: nestedRepoAbsPath,
    worktreeRoot: targetParent,
    branchName,
    worktreeName: path.basename(targetPath),
  })
}

interface MaterializeNestedRepoWorktreesConfig {
  readonly repoRoot: string
  readonly worktreePath: string
  readonly nestedRepos: readonly { repoPath: string; branch: string }[]
}

/**
 * Back-compat wrapper around {@link createSubrepoWorktree}. Iterates the
 * configured nested repos and ensures each has a worktree at
 * `<worktreePath>/<repoPath>/`. Cleans any pre-existing directory at the
 * target before creating so reruns are idempotent.
 *
 * Prefer calling {@link createSubrepoWorktree} directly for new code — it
 * accepts more options (baseBranch override, autoPull).
 */
export function materializeNestedRepoWorktrees({
  repoRoot,
  worktreePath,
  nestedRepos,
}: MaterializeNestedRepoWorktreesConfig): void {
  for (const nestedRepo of nestedRepos) {
    const sourceRepoPath = path.join(repoRoot, nestedRepo.repoPath)
    const targetRepoPath = path.join(worktreePath, nestedRepo.repoPath)

    fs.rmSync(targetRepoPath, { recursive: true, force: true })

    createSubrepoWorktree({
      nestedRepoAbsPath: sourceRepoPath,
      targetPath: targetRepoPath,
      branchName: nestedRepo.branch,
    })
  }
}
