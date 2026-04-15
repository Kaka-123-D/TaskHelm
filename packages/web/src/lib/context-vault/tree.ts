import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

export interface ContextVaultTreeFileNode {
  readonly kind: 'file'
  readonly name: string
  readonly path: string
  readonly file: PersistedContextVaultFile
}

export interface ContextVaultTreeFolderNode {
  readonly kind: 'folder'
  readonly name: string
  readonly path: string
  readonly children: readonly ContextVaultTreeNode[]
}

export type ContextVaultTreeNode = ContextVaultTreeFileNode | ContextVaultTreeFolderNode

interface MutableFolderNode {
  readonly kind: 'folder'
  readonly name: string
  readonly path: string
  readonly folders: Map<string, MutableFolderNode>
  readonly files: ContextVaultTreeFileNode[]
}

function createFolder(name: string, path: string): MutableFolderNode {
  return {
    kind: 'folder',
    name,
    path,
    folders: new Map(),
    files: [],
  }
}

function finalizeFolder(folder: MutableFolderNode): ContextVaultTreeFolderNode {
  const folderChildren = [...folder.folders.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(finalizeFolder)
  const fileChildren = [...folder.files].sort((left, right) => left.path.localeCompare(right.path))

  return {
    kind: 'folder',
    name: folder.name,
    path: folder.path,
    children: [...folderChildren, ...fileChildren],
  }
}

export function buildContextVaultTree(
  files: readonly PersistedContextVaultFile[],
): readonly ContextVaultTreeNode[] {
  const root = createFolder('', '')

  for (const file of files) {
    const segments = file.relativePath.split('/').filter(Boolean)
    const filename = segments.pop()

    if (!filename) {
      continue
    }

    let current = root
    let currentPath = ''

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      let next = current.folders.get(segment)
      if (!next) {
        next = createFolder(segment, currentPath)
        current.folders.set(segment, next)
      }
      current = next
    }

    current.files.push({
      kind: 'file',
      name: filename,
      path: file.relativePath,
      file,
    })
  }

  return finalizeFolder(root).children
}
