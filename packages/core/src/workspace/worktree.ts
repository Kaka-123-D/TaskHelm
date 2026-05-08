import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface WorktreeConfig {
  readonly repoRoot: string
  readonly worktreeRoot: string
  readonly branchName: string
}

function sanitizeWorktreeDirName(branchName: string): string {
  return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
}

// `git worktree prune` clears registry entries that point to directories that
// no longer exist on disk. Cheap and safe to run before any add/remove — the
// alternative is hitting "fatal: '<path>' is already a working tree" errors
// when the user (or a previous TaskHelm bug) deleted the worktree directory
// without `git worktree remove`.
function pruneWorktrees(repoRoot: string): void {
  try {
    execSync('git worktree prune', { cwd: repoRoot, stdio: 'pipe' })
  } catch {
    // Best-effort — if prune fails the subsequent add/remove will surface its
    // own error.
  }
}

export function createWorktree(config: WorktreeConfig): string {
  const { repoRoot, worktreeRoot, branchName } = config
  const dirName = sanitizeWorktreeDirName(branchName)
  const worktreePath = path.join(worktreeRoot, dirName)

  pruneWorktrees(repoRoot)

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
  // If the directory is already gone (user manually `rm -rf`-ed it), `git
  // worktree remove` errors with "is not a working tree". Fall back to prune
  // so the registry entry still gets cleaned up.
  const exists = fs.existsSync(worktreePath)

  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
    return
  } catch (error) {
    if (!exists) {
      pruneWorktrees(repoRoot)
      return
    }
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
