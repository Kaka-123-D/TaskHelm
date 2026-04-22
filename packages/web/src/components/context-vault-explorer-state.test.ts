import { describe, expect, it } from 'vitest'
import {
  getVisibleContextVaultExplorerError,
  shouldAutoBrowseFallback,
  shouldRenderFallbackBrowserList,
} from './context-vault-explorer-state'

describe('context-vault-explorer-state', () => {
  it('does not auto-browse fallback data when native picker is available and fallback is hidden', () => {
    expect(
      shouldAutoBrowseFallback({
        open: true,
        showFallbackBrowser: false,
      }),
    ).toBe(false)
  })

  it('only surfaces fallback browse errors while fallback browser is visible', () => {
    expect(
      getVisibleContextVaultExplorerError({
        nativeError: null,
        browseError: 'Directory not found',
        externalError: null,
        showFallbackBrowser: false,
      }),
    ).toBeNull()

    expect(
      getVisibleContextVaultExplorerError({
        nativeError: null,
        browseError: 'Directory not found',
        externalError: null,
        showFallbackBrowser: true,
      }),
    ).toBe('Directory not found')
  })

  it('does not render an empty fallback browser container without data or loading state', () => {
    expect(
      shouldRenderFallbackBrowserList({
        showFallbackBrowser: true,
        browseLoading: false,
        hasData: false,
      }),
    ).toBe(false)

    expect(
      shouldRenderFallbackBrowserList({
        showFallbackBrowser: true,
        browseLoading: true,
        hasData: false,
      }),
    ).toBe(true)
  })
})
