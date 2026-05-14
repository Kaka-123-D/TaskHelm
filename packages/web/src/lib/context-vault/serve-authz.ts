import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Task } from '@taskhelm/core'
import { readPersistedContextVault } from '@/lib/context-vault/persisted-vault'

export interface AuthorizedFile {
  readonly canonicalPath: string
}

export class FileServeAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileServeAuthorizationError'
  }
}

function canonicalize(absolutePath: string): string {
  // `realpathSync` follows symlinks. Falls back to `resolve` when the path
  // cannot be canonicalised (e.g. file vanished mid-request) — in that case
  // the caller will still hit ENOENT on the stream, which is fine.
  try {
    return fs.realpathSync.native(absolutePath)
  } catch {
    return path.resolve(absolutePath)
  }
}

function isWithin(parent: string, child: string): boolean {
  if (parent === child) {
    return true
  }
  const sep = path.sep
  const parentWithSep = parent.endsWith(sep) ? parent : parent + sep
  return child.startsWith(parentWithSep)
}

/**
 * Authorise serving `requestedPath` for a task. The path is allowed iff
 * its canonical form lies within the canonical form of any source that the
 * task has registered (via Update Vault). Anything else — `/etc/passwd`,
 * a sibling user's home, traversal via `..` — is rejected.
 *
 * Native-picker selections don't carry an absolute root, so they never
 * authorise via this route; those previews use blob URLs in the browser.
 */
export function authorizeServePath(task: Task, requestedPath: string): AuthorizedFile {
  if (!requestedPath || !path.isAbsolute(requestedPath)) {
    throw new FileServeAuthorizationError('Path must be an absolute filesystem path')
  }

  const persisted = readPersistedContextVault(task)
  const sources = persisted.sources.filter(source => path.isAbsolute(source))
  if (sources.length === 0) {
    throw new FileServeAuthorizationError('Task has no registered context vault sources')
  }

  const canonicalFile = canonicalize(requestedPath)
  for (const source of sources) {
    const canonicalSource = canonicalize(source)
    if (isWithin(canonicalSource, canonicalFile)) {
      return { canonicalPath: canonicalFile }
    }
  }

  throw new FileServeAuthorizationError('Path is not within a registered context vault source')
}
