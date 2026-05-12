/**
 * Validation for the user-supplied worktree-group name that ends up as
 * `task.key`. The value becomes the single-segment folder under
 * `<project>/.worktrees/<key>/`, so it must be safe for use as a path
 * component (no slashes, no whitespace, no exotic chars).
 *
 * Kept narrow on purpose — the existing branch sanitiser strips unsafe
 * characters silently, which would surprise the user. Here we reject up
 * front so they can fix the input.
 */
const SAFE_WORKTREE_GROUP_KEY = /^[A-Za-z0-9._-]+$/

export function assertSafeWorktreeGroupKey(value: string): string {
  const normalized = value.trim()
  if (normalized.length === 0) {
    throw new Error('Worktree folder name is required for multi-repo projects')
  }
  if (!SAFE_WORKTREE_GROUP_KEY.test(normalized)) {
    throw new Error(
      'Worktree folder name may only contain letters, digits, dot, hyphen, and underscore'
    )
  }
  return normalized
}
