import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { assertSafeBranchName, currentBranch, prepareBranchForWorktree } from '@/lib/workspace/base-branch'

interface NestedRepoBranchConfig {
  readonly repoPath: string
  readonly branch: string
}

interface NestedWorktreeConfig {
  readonly repoRoot: string
  readonly worktreePath: string
  readonly nestedRepos: readonly NestedRepoBranchConfig[]
}

function checkoutBranch(repoRoot: string, branchName: string): void {
  execSync(`git checkout "${branchName}"`, {
    cwd: repoRoot,
    stdio: 'pipe',
  })
}

export function materializeNestedRepoWorktrees({
  repoRoot,
  worktreePath,
  nestedRepos,
}: NestedWorktreeConfig): void {
  for (const nestedRepo of nestedRepos) {
    const branchName = assertSafeBranchName(nestedRepo.branch)
    const sourceRepoPath = path.join(repoRoot, nestedRepo.repoPath)
    const targetRepoPath = path.join(worktreePath, nestedRepo.repoPath)

    fs.rmSync(targetRepoPath, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(targetRepoPath), { recursive: true })

    execSync(`git clone "${sourceRepoPath}" "${targetRepoPath}"`, {
      stdio: 'pipe',
    })

    prepareBranchForWorktree({
      repoRoot: targetRepoPath,
      targetBranch: branchName,
      baseBranch: currentBranch(sourceRepoPath),
      autoPull: false,
      forceRefresh: false,
    })
    checkoutBranch(targetRepoPath, branchName)
  }
}
