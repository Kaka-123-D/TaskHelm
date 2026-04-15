import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextFilePreview } from '@/components/context-file-preview'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('ContextFilePreview', () => {
  it('renders markdown content as preview markup with mermaid placeholder', () => {
    const file: PersistedContextVaultFile = {
      relativePath: 'docs/context.md',
      absolutePath: '/tmp/docs/context.md',
      content:
        '# Context\n\n- alpha\n- beta\n  - nested\n\n1. one\n2. two\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n> Note\n\n```mermaid\ngraph TD\n  A-->B\n```',
      category: 'markdown',
      mediaType: 'text/markdown',
    }

    const markup = renderToStaticMarkup(
      <ContextFilePreview file={file} />,
    )

    expect(markup).toContain('<h1>Context</h1>')
    expect(markup).toContain('context-preview-markdown-body')
    expect(markup).toContain('context-preview-list context-preview-list--unordered')
    expect(markup).toContain('context-preview-list context-preview-list--ordered')
    expect(markup).toContain('context-preview-list-item')
    expect(markup).toContain('<table>')
    expect(markup).toContain('context-preview-blockquote')
    expect(markup).toContain('data-slot="mermaid-block"')
  })

  it('renders image files as images', () => {
    const file: PersistedContextVaultFile = {
      relativePath: 'images/diagram.png',
      absolutePath: '/tmp/images/diagram.png',
      content: 'data:image/png;base64,AAA',
      category: 'image',
      mediaType: 'image/png',
    }

    const markup = renderToStaticMarkup(
      <ContextFilePreview file={file} />,
    )

    expect(markup).toContain('<img')
    expect(markup).toContain('src="data:image/png;base64,AAA"')
  })
})
