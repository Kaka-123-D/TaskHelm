import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

interface ResolveContextVaultSelectionInput {
  readonly files: readonly Pick<PersistedContextVaultFile, 'relativePath'>[]
  readonly currentSelectedFile?: string | null
  readonly persistedSelectedFile?: string | null
}

export function resolveContextVaultSelection({
  files,
  currentSelectedFile,
  persistedSelectedFile,
}: ResolveContextVaultSelectionInput): string | null {
  const hasFile = (candidate: string | null | undefined) =>
    Boolean(candidate && files.some(file => file.relativePath === candidate))

  if (hasFile(currentSelectedFile)) {
    return currentSelectedFile ?? null
  }

  if (hasFile(persistedSelectedFile)) {
    return persistedSelectedFile ?? null
  }

  return files[0]?.relativePath ?? null
}
