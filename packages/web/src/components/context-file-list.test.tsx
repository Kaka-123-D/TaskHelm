import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextFileList } from '@/components/context-file-list'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

vi.mock('motion/react', () => ({
  motion: {
    button: ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) => (
      <button {...props}>{children}</button>
    ),
  },
}))

const files: readonly PersistedContextVaultFile[] = [
  {
    relativePath: 'docs/context.md',
    absolutePath: '/tmp/docs/context.md',
    content: '# Context',
    category: 'markdown',
    mediaType: 'text/markdown',
  },
]

describe('ContextFileList', () => {
  it('renders an expand control and hides file rows when collapsed', () => {
    const markup = renderToStaticMarkup(
      <ContextFileList
        files={files}
        selectedFile="docs/context.md"
        collapsed
        onSelect={() => {}}
        onToggleCollapse={() => {}}
      />,
    )

    expect(markup).toContain('Expand')
    expect(markup).not.toContain('context.md')
  })
})
