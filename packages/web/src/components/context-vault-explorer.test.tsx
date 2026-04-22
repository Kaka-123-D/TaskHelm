import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextVaultExplorer } from '@/components/context-vault-explorer'

vi.mock('@/components/design-system/glass-modal', () => ({
  GlassModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('ContextVaultExplorer', () => {
  it('renders native picker actions with a manual path fallback', () => {
    const markup = renderToStaticMarkup(
      <ContextVaultExplorer
        open
        loading={false}
        error={null}
        onClose={() => {}}
        onExplore={() => {}}
        onExploreNative={() => {}}
      />,
    )

    expect(markup).toContain('Choose folder')
    expect(markup).toContain('Choose file')
    expect(markup).toContain('Update Vault')
    expect(markup).toContain('Local path')
    expect(markup).toContain('If the system picker does not work on your machine')
  })
})
