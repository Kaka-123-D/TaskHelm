import { execSync } from 'node:child_process'
import { branchExists, createBranch } from '@taskhelm/core'

export function checkoutOrCreateBranch(repoRoot: string, branchName: string): void {
  if (!branchExists(repoRoot, branchName)) {
    createBranch(repoRoot, branchName)
  }

  execSync(`git checkout "${branchName}"`, {
    cwd: repoRoot,
    stdio: 'pipe',
  })
}
