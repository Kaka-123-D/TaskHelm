import * as fs from 'node:fs'
import * as path from 'node:path'
import { classifyContextVaultFile, supportedContextVaultFile } from '@/lib/context-vault/file-preview'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/')
}

function readSupportedFile(filePath: string, basePath: string): PersistedContextVaultFile {
  const preview = classifyContextVaultFile(filePath)
  const buffer = fs.readFileSync(filePath)
  const content =
    preview.category === 'image'
      ? `data:${preview.mediaType};base64,${buffer.toString('base64')}`
      : buffer.toString('utf8')

  return {
    absolutePath: filePath,
    relativePath: normalizeRelativePath(path.relative(basePath, filePath)),
    content,
    category: preview.category,
    mediaType: preview.mediaType,
  }
}

function walkSupportedFiles(rootPath: string, currentPath: string, files: PersistedContextVaultFile[]): void {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const fullPath = path.join(currentPath, entry.name)
    if (entry.isDirectory()) {
      walkSupportedFiles(rootPath, fullPath, files)
      continue
    }

    if (entry.isFile() && supportedContextVaultFile(entry.name)) {
      files.push(readSupportedFile(fullPath, rootPath))
    }
  }
}

export function discoverMarkdownFiles(inputPath: string): {
  readonly rootPath: string
  readonly files: readonly PersistedContextVaultFile[]
} {
  const resolvedPath = path.resolve(inputPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Path not found: ${resolvedPath}`)
  }

  const stat = fs.statSync(resolvedPath)
  if (stat.isFile()) {
    if (!supportedContextVaultFile(resolvedPath)) {
      throw new Error('Selected file must be a supported text, markdown, or image file')
    }

    const parentDir = path.dirname(resolvedPath)
    return {
      rootPath: parentDir,
      files: [readSupportedFile(resolvedPath, parentDir)],
    }
  }

  if (!stat.isDirectory()) {
    throw new Error('Selected path must be a file or directory')
  }

  const files: PersistedContextVaultFile[] = []
  walkSupportedFiles(resolvedPath, resolvedPath, files)
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  return {
    rootPath: resolvedPath,
    files,
  }
}
