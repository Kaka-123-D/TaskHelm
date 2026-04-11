import { execSync } from 'node:child_process'

export interface BranchConfig {
  readonly pattern: string
  readonly repoRoot: string
}

export function formatBranchName(
  pattern: string,
  task: { id: string; key: string | null }
): string {
  const keyOrId = task.key ?? task.id
  const raw = pattern
    .replace(/\{key\}/g, keyOrId)
    .replace(/\{id\}/g, task.id)

  return sanitizeBranchName(raw)
}

function sanitizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9/_-]/g, '')
}

export function createBranch(repoRoot: string, branchName: string, baseBranch?: string): void {
  try {
    const args = baseBranch
      ? `git branch "${branchName}" "${baseBranch}"`
      : `git branch "${branchName}"`
    execSync(args, { cwd: repoRoot, stdio: 'pipe' })
  } catch (error) {
    throw new Error(
      `Failed to create branch "${branchName}": ${(error as Error).message}`
    )
  }
}

export function branchExists(repoRoot: string, branchName: string): boolean {
  try {
    const output = execSync(`git branch --list "${branchName}"`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
    return output.toString().trim().length > 0
  } catch {
    return false
  }
}
