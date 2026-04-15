import { describe, expect, it } from 'vitest'
import { resolveContextVaultSelection } from '@/lib/context-vault/selection'

describe('resolveContextVaultSelection', () => {
  const files = [
    { relativePath: 'alpha.md', absolutePath: '/tmp/alpha.md', content: '# Alpha' },
    { relativePath: 'beta.md', absolutePath: '/tmp/beta.md', content: '# Beta' },
  ]

  it('keeps the current selection during refresh when that file still exists', () => {
    expect(
      resolveContextVaultSelection({
        files,
        currentSelectedFile: 'beta.md',
        persistedSelectedFile: 'alpha.md',
      }),
    ).toBe('beta.md')
  })

  it('falls back to persisted selection when the current selection is missing', () => {
    expect(
      resolveContextVaultSelection({
        files,
        currentSelectedFile: 'missing.md',
        persistedSelectedFile: 'alpha.md',
      }),
    ).toBe('alpha.md')
  })

  it('falls back to the first file when neither preferred selection exists', () => {
    expect(
      resolveContextVaultSelection({
        files,
        currentSelectedFile: 'missing.md',
        persistedSelectedFile: 'also-missing.md',
      }),
    ).toBe('alpha.md')
  })
})
