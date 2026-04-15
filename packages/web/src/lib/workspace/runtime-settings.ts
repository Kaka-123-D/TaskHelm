import type { Task } from '@taskhelm/core'

export interface WorkspaceSubrepoBranch {
  readonly repoPath: string
  readonly branch: string
}

function normalizeBranchValue(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

export function parseWorkspaceSubrepoBranches(value: string | null | undefined): readonly WorkspaceSubrepoBranch[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((entry): entry is WorkspaceSubrepoBranch => {
        return typeof entry === 'object' && entry !== null
          && typeof (entry as { repoPath?: unknown }).repoPath === 'string'
          && typeof (entry as { branch?: unknown }).branch === 'string'
      })
      .map(entry => ({
        repoPath: entry.repoPath,
        branch: normalizeBranchValue(entry.branch),
      }))
      .filter(entry => entry.repoPath.length > 0 && entry.branch.length > 0)
  } catch {
    return []
  }
}

export function serializeWorkspaceSubrepoBranches(
  entries: readonly WorkspaceSubrepoBranch[],
): string | null {
  if (entries.length === 0) {
    return null
  }

  return JSON.stringify(entries)
}

export function normalizeWorkspaceSubrepoBranches(
  entries: readonly WorkspaceSubrepoBranch[],
  detectedSubrepos: readonly string[],
): readonly WorkspaceSubrepoBranch[] {
  const detected = new Set(detectedSubrepos)

  return entries
    .filter(entry => detected.has(entry.repoPath))
    .map(entry => ({
      repoPath: entry.repoPath,
      branch: normalizeBranchValue(entry.branch),
    }))
    .filter(entry => entry.branch.length > 0)
    .sort((left, right) => left.repoPath.localeCompare(right.repoPath))
}

export function workspaceNameExistsInProject(
  tasks: readonly Task[],
  workspaceName: string,
  currentTaskId: string,
): boolean {
  const normalizedName = workspaceName.trim().toLowerCase()
  if (!normalizedName) {
    return false
  }

  return tasks.some(task => {
    return task.id !== currentTaskId
      && task.workspace_name?.trim().toLowerCase() === normalizedName
  })
}
