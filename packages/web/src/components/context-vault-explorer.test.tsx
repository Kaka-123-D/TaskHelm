import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextVaultExplorer } from '@/components/context-vault-explorer'

vi.mock('@/components/design-system/glass-modal', () => ({
  GlassModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('ContextVaultExplorer', () => {
  it('renders a browse-system flow instead of a raw path input', () => {
    const markup = renderToStaticMarkup(
      <ContextVaultExplorer
        open
        loading={false}
        error={null}
        initialPath=""
        onClose={() => {}}
        onExplore={() => {}}
      />,
    )

    expect(markup).toContain('Choose folder')
    expect(markup).toContain('Choose file')
    expect(markup).toContain('Load Context Files')
    expect(markup).not.toContain('Markdown file or folder path')
  })
})
