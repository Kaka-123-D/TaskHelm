function parentFolders(relativePath: string): string[] {
  const segments = relativePath.split('/').filter(Boolean)
  const parents: string[] = []

  for (let index = 0; index < segments.length - 1; index += 1) {
    parents.push(segments.slice(0, index + 1).join('/'))
  }

  return parents
}

export function createInitialExpandedFolders(
  folderPaths: readonly string[],
  selectedFile: string | null,
): ReadonlySet<string> {
  const expanded = new Set<string>(folderPaths.filter(folderPath => !folderPath.includes('/')))

  if (selectedFile) {
    for (const folderPath of parentFolders(selectedFile)) {
      expanded.add(folderPath)
    }
  }

  return expanded
}

export function ensureSelectedFileFoldersExpanded(
  expandedFolders: ReadonlySet<string>,
  selectedFile: string | null,
): ReadonlySet<string> {
  const next = new Set(expandedFolders)

  if (selectedFile) {
    for (const folderPath of parentFolders(selectedFile)) {
      next.add(folderPath)
    }
  }

  return next
}
