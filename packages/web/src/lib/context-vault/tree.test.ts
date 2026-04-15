import { describe, expect, it } from 'vitest'
import { buildContextVaultTree } from '@/lib/context-vault/tree'

describe('buildContextVaultTree', () => {
  it('groups files into nested folders while preserving file nodes', () => {
    const tree = buildContextVaultTree([
      { relativePath: 'docs/context.md', absolutePath: '/tmp/docs/context.md', content: '# Context' },
      { relativePath: 'docs/images/diagram.png', absolutePath: '/tmp/docs/images/diagram.png', content: 'data:' },
      { relativePath: 'notes.txt', absolutePath: '/tmp/notes.txt', content: 'notes' },
    ])

    expect(tree).toEqual([
      {
        kind: 'folder',
        name: 'docs',
        path: 'docs',
        children: [
          {
            kind: 'folder',
            name: 'images',
            path: 'docs/images',
            children: [
              {
                kind: 'file',
                name: 'diagram.png',
                path: 'docs/images/diagram.png',
                file: expect.objectContaining({ relativePath: 'docs/images/diagram.png' }),
              },
            ],
          },
          {
            kind: 'file',
            name: 'context.md',
            path: 'docs/context.md',
            file: expect.objectContaining({ relativePath: 'docs/context.md' }),
          },
        ],
      },
      {
        kind: 'file',
        name: 'notes.txt',
        path: 'notes.txt',
        file: expect.objectContaining({ relativePath: 'notes.txt' }),
      },
    ])
  })
})
