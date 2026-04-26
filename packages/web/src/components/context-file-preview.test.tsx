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

  it('renders context vault asset references embedded in markdown', () => {
    const file: PersistedContextVaultFile = {
      relativePath: 'docs/context.md',
      absolutePath: '/tmp/docs/context.md',
      content: 'Attached image:\n\n[@/assets/shot.png]\n\nAttached video:\n\n[@/media/demo.mp4]',
      category: 'markdown',
      mediaType: 'text/markdown',
    }
    const files: readonly PersistedContextVaultFile[] = [
      file,
      {
        relativePath: 'assets/shot.png',
        absolutePath: '/tmp/assets/shot.png',
        content: 'data:image/png;base64,AAA',
        category: 'image',
        mediaType: 'image/png',
      },
      {
        relativePath: 'media/demo.mp4',
        absolutePath: '/tmp/media/demo.mp4',
        content: 'data:video/mp4;base64,BBB',
        category: 'video',
        mediaType: 'video/mp4',
      },
    ]

    const markup = renderToStaticMarkup(
      <ContextFilePreview file={file} files={files} />,
    )

    expect(markup).toContain('context-preview-referenced-asset')
    expect(markup).toContain('src="data:image/png;base64,AAA"')
    expect(markup).toContain('src="data:video/mp4;base64,BBB"')
    expect(markup).not.toContain('[@/assets/shot.png]')
    expect(markup).not.toContain('[@/media/demo.mp4]')
  })

  it('renders asset references without leading slash ([@path] form)', () => {
    const file: PersistedContextVaultFile = {
      relativePath: 'docs/context.md',
      absolutePath: '/tmp/docs/context.md',
      content: '[@tasks/LRC-12424/gyazo/clip.mp4]\n\n[@customer/tickets/spec.png]',
      category: 'markdown',
      mediaType: 'text/markdown',
    }
    const files: readonly PersistedContextVaultFile[] = [
      file,
      {
        relativePath: 'tasks/LRC-12424/gyazo/clip.mp4',
        absolutePath: '/tmp/tasks/LRC-12424/gyazo/clip.mp4',
        content: 'data:video/mp4;base64,VVV',
        category: 'video',
        mediaType: 'video/mp4',
      },
      {
        relativePath: 'customer/tickets/spec.png',
        absolutePath: '/tmp/customer/tickets/spec.png',
        content: 'data:image/png;base64,III',
        category: 'image',
        mediaType: 'image/png',
      },
    ]

    const markup = renderToStaticMarkup(
      <ContextFilePreview file={file} files={files} />,
    )

    expect(markup).toContain('src="data:video/mp4;base64,VVV"')
    expect(markup).toContain('src="data:image/png;base64,III"')
    expect(markup).not.toContain('[@tasks/LRC-12424/gyazo/clip.mp4]')
    expect(markup).not.toContain('[@customer/tickets/spec.png]')
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

  it('renders video files as videos', () => {
    const file: PersistedContextVaultFile = {
      relativePath: 'videos/demo.mp4',
      absolutePath: '/tmp/videos/demo.mp4',
      content: 'data:video/mp4;base64,AAA',
      category: 'video',
      mediaType: 'video/mp4',
    }

    const markup = renderToStaticMarkup(
      <ContextFilePreview file={file} />,
    )

    expect(markup).toContain('<video')
    expect(markup).toContain('controls')
    expect(markup).toContain('playsInline')
    expect(markup).toContain('src="data:video/mp4;base64,AAA"')
  })
})
