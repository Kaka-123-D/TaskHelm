import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { classifyContextVaultFile, supportedContextVaultFile } from '@/lib/context-vault/file-preview'

export interface NativeFileBlob {
  readonly text: () => Promise<string>
  readonly arrayBuffer?: () => Promise<ArrayBuffer>
  readonly size?: number
  readonly type?: string
}

export interface NativeFileHandleLike {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<NativeFileBlob>
}

export interface NativeDirectoryHandleLike {
  readonly kind: 'directory'
  readonly name: string
  entries(): AsyncIterable<[string, NativeHandleLike]>
}

export type NativeHandleLike = NativeFileHandleLike | NativeDirectoryHandleLike

export type NativeSelection =
  | {
      readonly kind: 'file'
      readonly handle: NativeFileHandleLike
    }
  | {
      readonly kind: 'directory'
      readonly handle: NativeDirectoryHandleLike
    }

export interface NativeDiscoveredFile extends PersistedContextVaultFile {
  /**
   * Lazy accessor for the original Blob. Native picker handles cannot be
   * persisted (browser security), so the preview layer uses these blobs to
   * mint `URL.createObjectURL` URLs at render time instead of base64.
   * Cleared when the file handle is released.
   */
  readonly getBlob?: () => Promise<Blob>
}

async function readNativeFile(
  handle: NativeFileHandleLike,
  segments: readonly string[],
  rootLabel: string,
  includeRootLabel = true,
): Promise<NativeDiscoveredFile[]> {
  if (!supportedContextVaultFile(handle.name)) {
    return []
  }

  const blob = await handle.getFile()
  const relativePath = [...segments, handle.name].join('/')
  const preview = classifyContextVaultFile(handle.name)
  const isBinary = preview.category === 'image' || preview.category === 'video'

  // Text files are usually small (markdown, code) — keep them inline so the
  // preview hook can render them without an extra fetch. Binaries are left
  // as metadata + blob accessor; the preview layer builds a blob URL.
  const inlineText = !isBinary ? await blob.text() : null

  return [
    {
      relativePath,
      absolutePath: includeRootLabel ? [rootLabel, ...segments, handle.name].join('/') : relativePath,
      content: inlineText,
      category: preview.category,
      mediaType: preview.mediaType,
      size: typeof blob.size === 'number' ? blob.size : undefined,
      getBlob: isBinary ? async () => (await handle.getFile()) as unknown as Blob : undefined,
    },
  ]
}

async function readNativeDirectory(
  handle: NativeDirectoryHandleLike,
  segments: readonly string[],
  rootLabel: string,
): Promise<NativeDiscoveredFile[]> {
  const files: NativeDiscoveredFile[] = []

  for await (const [, childHandle] of handle.entries()) {
    if (childHandle.kind === 'directory') {
      files.push(
        ...(await readNativeDirectory(childHandle, [...segments, childHandle.name], rootLabel)),
      )
      continue
    }

    files.push(...(await readNativeFile(childHandle, segments, rootLabel)))
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

export async function discoverMarkdownFromNativeSelection(selection: NativeSelection): Promise<{
  readonly rootPath: string
  readonly files: readonly NativeDiscoveredFile[]
}> {
  if (selection.kind === 'file') {
    return {
      rootPath: selection.handle.name,
      files: await readNativeFile(selection.handle, [], selection.handle.name, false),
    }
  }

  return {
    rootPath: selection.handle.name,
    files: await readNativeDirectory(selection.handle, [], selection.handle.name),
  }
}
