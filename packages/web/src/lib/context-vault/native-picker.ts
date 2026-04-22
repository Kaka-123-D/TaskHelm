import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { classifyContextVaultFile, supportedContextVaultFile } from '@/lib/context-vault/file-preview'

export interface NativeFileHandleLike {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<{ text(): Promise<string>; arrayBuffer?: () => Promise<ArrayBuffer> }>
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

async function readMarkdownFileHandle(
  handle: NativeFileHandleLike,
  segments: readonly string[],
  rootLabel: string,
  includeRootLabel = true,
): Promise<PersistedContextVaultFile[]> {
  if (!supportedContextVaultFile(handle.name)) {
    return []
  }

  const file = await handle.getFile()
  const relativePath = [...segments, handle.name].join('/')
  const preview = classifyContextVaultFile(handle.name)
  const content =
    (preview.category === 'image' || preview.category === 'video') && file.arrayBuffer
      ? `data:${preview.mediaType};base64,${arrayBufferToBase64(await file.arrayBuffer())}`
      : await file.text()

  return [
    {
      relativePath,
      absolutePath: includeRootLabel ? [rootLabel, ...segments, handle.name].join('/') : relativePath,
      content,
      category: preview.category,
      mediaType: preview.mediaType,
    },
  ]
}

async function readMarkdownDirectoryHandle(
  handle: NativeDirectoryHandleLike,
  segments: readonly string[],
  rootLabel: string,
): Promise<PersistedContextVaultFile[]> {
  const files: PersistedContextVaultFile[] = []

  for await (const [, childHandle] of handle.entries()) {
    if (childHandle.kind === 'directory') {
      files.push(
        ...(await readMarkdownDirectoryHandle(childHandle, [...segments, childHandle.name], rootLabel)),
      )
      continue
    }

    files.push(...(await readMarkdownFileHandle(childHandle, segments, rootLabel)))
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

export async function discoverMarkdownFromNativeSelection(selection: NativeSelection): Promise<{
  readonly rootPath: string
  readonly files: readonly PersistedContextVaultFile[]
}> {
  if (selection.kind === 'file') {
    return {
      rootPath: selection.handle.name,
      files: await readMarkdownFileHandle(selection.handle, [], selection.handle.name, false),
    }
  }

  return {
    rootPath: selection.handle.name,
    files: await readMarkdownDirectoryHandle(selection.handle, [], selection.handle.name),
  }
}
