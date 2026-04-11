import { execSync } from 'node:child_process'
import * as path from 'node:path'

export interface WorktreeConfig {
  readonly repoRoot: string
  readonly worktreeRoot: string
  readonly branchName: string
}

function sanitizeWorktreeDirName(branchName: string): string {
  return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
}

export function createWorktree(config: WorktreeConfig): string {
  const { repoRoot, worktreeRoot, branchName } = config
  const dirName = sanitizeWorktreeDirName(branchName)
  const worktreePath = path.join(worktreeRoot, dirName)

  try {
    execSync(`git worktree add "${worktreePath}" "${branchName}"`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
  } catch (error) {
    throw new Error(
      `Failed to create worktree at "${worktreePath}" for branch "${branchName}": ${(error as Error).message}`
    )
  }

  return worktreePath
}

export function removeWorktree(repoRoot: string, worktreePath: string): void {
  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
  } catch (error) {
    throw new Error(
      `Failed to remove worktree at "${worktreePath}": ${(error as Error).message}`
    )
  }
}

export function listWorktrees(repoRoot: string): readonly string[] {
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd: repoRoot,
      stdio: 'pipe',
    })
    const lines = output.toString().split('\n')
    const worktrees: string[] = []

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        worktrees.push(line.slice('worktree '.length).trim())
      }
    }

    return worktrees
  } catch (error) {
    throw new Error(`Failed to list worktrees: ${(error as Error).message}`)
  }
}
