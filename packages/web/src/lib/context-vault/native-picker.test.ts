import { describe, expect, it } from 'vitest'
import {
  discoverMarkdownFromNativeSelection,
  type NativeDirectoryHandleLike,
  type NativeFileHandleLike,
} from '@/lib/context-vault/native-picker'

function createFileHandle(name: string, content: string): NativeFileHandleLike {
  return {
    kind: 'file',
    name,
    async getFile() {
      return {
        async text() {
          return content
        },
      }
    },
  }
}

function createDirectoryHandle(
  name: string,
  entries: readonly [string, NativeFileHandleLike | NativeDirectoryHandleLike][],
): NativeDirectoryHandleLike {
  return {
    kind: 'directory',
    name,
    async *entries() {
      for (const entry of entries) {
        yield entry
      }
    },
  }
}

describe('discoverMarkdownFromNativeSelection', () => {
  it('collects supported context files recursively from a selected directory handle', async () => {
    const directory = createDirectoryHandle('docs', [
      ['context.md', createFileHandle('context.md', '# Context\n')],
      ['notes.txt', createFileHandle('notes.txt', 'ignore')],
      [
        'guides',
        createDirectoryHandle('guides', [
          ['plan.md', createFileHandle('plan.md', '# Plan\n')],
        ]),
      ],
    ])

    await expect(
      discoverMarkdownFromNativeSelection({
        kind: 'directory',
        handle: directory,
      }),
    ).resolves.toEqual({
      rootPath: 'docs',
      files: [
        {
          relativePath: 'context.md',
          absolutePath: 'docs/context.md',
          content: '# Context\n',
          category: 'markdown',
          mediaType: 'text/markdown',
        },
        {
          relativePath: 'guides/plan.md',
          absolutePath: 'docs/guides/plan.md',
          content: '# Plan\n',
          category: 'markdown',
          mediaType: 'text/markdown',
        },
        {
          relativePath: 'notes.txt',
          absolutePath: 'docs/notes.txt',
          content: 'ignore',
          category: 'text',
          mediaType: 'text/plain',
        },
      ],
    })
  })

  it('collects one supported file from a selected file handle', async () => {
    await expect(
      discoverMarkdownFromNativeSelection({
        kind: 'file',
        handle: createFileHandle('context.md', '# Context\n'),
      }),
    ).resolves.toEqual({
      rootPath: 'context.md',
      files: [
        {
          relativePath: 'context.md',
          absolutePath: 'context.md',
          content: '# Context\n',
          category: 'markdown',
          mediaType: 'text/markdown',
        },
      ],
    })
  })
})
