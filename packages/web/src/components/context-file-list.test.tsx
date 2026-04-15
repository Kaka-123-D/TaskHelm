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
  {
    relativePath: 'docs/images/diagram.png',
    absolutePath: '/tmp/docs/images/diagram.png',
    content: 'data:image/png;base64,AAA',
    category: 'image',
    mediaType: 'image/png',
  },
]

describe('ContextFileList', () => {
  it('renders an icon-only expand control and hides file rows when collapsed', () => {
    const markup = renderToStaticMarkup(
      <ContextFileList
        files={files}
        selectedFile="docs/context.md"
        collapsed
        onSelect={() => {}}
        onToggleCollapse={() => {}}
      />,
    )

    expect(markup).toContain('aria-label="Expand file list"')
    expect(markup).not.toContain('Expand list')
    expect(markup).not.toContain('context.md')
  })

  it('renders folders as toggleable rows with expanded state', () => {
    const markup = renderToStaticMarkup(
      <ContextFileList
        files={files}
        selectedFile="docs/context.md"
        onSelect={() => {}}
      />,
    )

    expect(markup).toContain('data-node-kind="folder"')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('docs')
  })
})
