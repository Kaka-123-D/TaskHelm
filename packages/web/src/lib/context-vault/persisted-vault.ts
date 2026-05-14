import type { Task } from '@taskhelm/core'
import { discoverMarkdownFiles } from '@/lib/context-vault/markdown-vault'
import type { ContextVaultFileCategory } from '@/lib/context-vault/file-preview'

export interface PersistedContextVaultFile {
  readonly relativePath: string
  readonly absolutePath: string
  /**
   * Inline content for the file. Modern flow leaves this `null` — preview is
   * served on demand via `/api/files/serve`. Older persisted rows may carry
   * a data-URL (image/video) or raw text payload, which is still honoured
   * by the preview component for backward compatibility.
   */
  readonly content: string | null
  readonly category?: ContextVaultFileCategory
  readonly mediaType?: string
  /** File size in bytes — populated by the discovery walker (best-effort). */
  readonly size?: number
}

function parseJsonArray<T>(value: string | null): readonly T[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? (parsed as readonly T[]) : []
  } catch {
    return []
  }
}

export function readPersistedContextVault(task: Task): {
  readonly rootPath: string | null
  readonly sources: readonly string[]
  readonly files: readonly PersistedContextVaultFile[]
  readonly selectedFile: string | null
} {
  const files = parseJsonArray<PersistedContextVaultFile>(task.context_vault_files_json).filter(file => {
    return Boolean(file?.relativePath && file?.absolutePath)
  })
  const selectedFile =
    task.context_vault_selected_file ??
    files[0]?.relativePath ??
    null

  return {
    rootPath: task.context_vault_root_path,
    sources: parseJsonArray<string>(task.context_vault_sources_json).filter(Boolean),
    files,
    selectedFile,
  }
}

export function resolveContextVault(task: Task): {
  readonly rootPath: string | null
  readonly sources: readonly string[]
  readonly files: readonly PersistedContextVaultFile[]
  readonly selectedFile: string | null
} {
  const persisted = readPersistedContextVault(task)

  if (persisted.sources.length === 0) {
    return persisted
  }

  const files: PersistedContextVaultFile[] = []
  let rootPath = persisted.rootPath

  for (const sourcePath of persisted.sources) {
    try {
      const discovered = discoverMarkdownFiles(sourcePath)
      rootPath ||= discovered.rootPath
      files.push(...discovered.files)
    } catch {
      // Ignore missing or unreadable sources and keep resolving the rest.
    }
  }

  const selectedFile =
    files.find(file => file.relativePath === persisted.selectedFile)?.relativePath ??
    files[0]?.relativePath ??
    null

  return {
    rootPath,
    sources: persisted.sources,
    files,
    selectedFile,
  }
}
