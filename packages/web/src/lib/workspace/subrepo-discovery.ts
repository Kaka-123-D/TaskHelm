import * as fs from 'node:fs'
import * as path from 'node:path'

const IGNORED_DIRS = new Set(['.git', '.worktrees', 'node_modules'])

function walkDirectories(rootPath: string, currentPath: string, found: string[]) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    if (IGNORED_DIRS.has(entry.name)) {
      continue
    }

    const absolutePath = path.join(currentPath, entry.name)
    const gitPath = path.join(absolutePath, '.git')

    if (fs.existsSync(gitPath)) {
      found.push(path.relative(rootPath, absolutePath))
      continue
    }

    walkDirectories(rootPath, absolutePath, found)
  }
}

export function discoverSubrepos(repoRoot: string): readonly string[] {
  if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
    return []
  }

  const found: string[] = []
  walkDirectories(repoRoot, repoRoot, found)
  return found.sort((left, right) => left.localeCompare(right))
}
