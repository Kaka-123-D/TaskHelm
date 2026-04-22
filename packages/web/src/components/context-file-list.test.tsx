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
        displayMode="collapsed"
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
    expect(markup).toContain('context-file-tree-rail')
    expect(markup).toContain('context-file-tree-branch')
  })

  it('renders icon rail items with accessible names when compact mode is active', () => {
    const markup = renderToStaticMarkup(
      <ContextFileList
        files={files}
        selectedFile="docs/context.md"
        displayMode="compact"
        onSelect={() => {}}
      />,
    )

    expect(markup).toContain('data-state="compact"')
    expect(markup).toContain('aria-label="File docs/context.md"')
    expect(markup).toContain('title="docs/context.md"')
    expect(markup).not.toContain('Context Files')
    expect(markup).not.toContain('context.md</span>')
  })

  it('renders image files with thumbnail previews in the list', () => {
    const markup = renderToStaticMarkup(
      <ContextFileList
        files={files}
        selectedFile="docs/images/diagram.png"
        onSelect={() => {}}
      />,
    )

    expect(markup).toContain('context-file-tree-icon--thumbnail')
    expect(markup).toContain('class="context-file-tree-thumbnail"')
    expect(markup).toContain('src="data:image/png;base64,AAA"')
  })
})
