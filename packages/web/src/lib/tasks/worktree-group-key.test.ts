import { describe, expect, it } from 'vitest'
import { assertSafeWorktreeGroupKey } from './worktree-group-key'

describe('assertSafeWorktreeGroupKey', () => {
  it('accepts simple alphanumerics', () => {
    expect(assertSafeWorktreeGroupKey('LRCC-2139')).toBe('LRCC-2139')
    expect(assertSafeWorktreeGroupKey('task_42')).toBe('task_42')
    expect(assertSafeWorktreeGroupKey('v1.2.3-beta')).toBe('v1.2.3-beta')
  })

  it('trims surrounding whitespace', () => {
    expect(assertSafeWorktreeGroupKey('  hotfix-1  ')).toBe('hotfix-1')
  })

  it('rejects empty / whitespace-only input', () => {
    expect(() => assertSafeWorktreeGroupKey('')).toThrow(/required/i)
    expect(() => assertSafeWorktreeGroupKey('   ')).toThrow(/required/i)
  })

  it('rejects slashes and other path-unsafe characters', () => {
    expect(() => assertSafeWorktreeGroupKey('feat/login')).toThrow(/may only contain/i)
    expect(() => assertSafeWorktreeGroupKey('with space')).toThrow(/may only contain/i)
    expect(() => assertSafeWorktreeGroupKey('quote"d')).toThrow(/may only contain/i)
    expect(() => assertSafeWorktreeGroupKey('có-dấu')).toThrow(/may only contain/i)
  })
})
