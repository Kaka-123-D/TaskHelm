interface AutoBrowseFallbackInput {
  readonly open: boolean
  readonly showFallbackBrowser: boolean
}

interface VisibleExplorerErrorInput {
  readonly nativeError: string | null
  readonly browseError: string | null
  readonly externalError: string | null
  readonly showFallbackBrowser: boolean
}

interface RenderFallbackBrowserListInput {
  readonly showFallbackBrowser: boolean
  readonly browseLoading: boolean
  readonly hasData: boolean
}

export function shouldAutoBrowseFallback(input: AutoBrowseFallbackInput): boolean {
  return input.open && input.showFallbackBrowser
}

export function getVisibleContextVaultExplorerError(input: VisibleExplorerErrorInput): string | null {
  if (input.nativeError) {
    return input.nativeError
  }

  if (input.showFallbackBrowser && input.browseError) {
    return input.browseError
  }

  return input.externalError
}

export function shouldRenderFallbackBrowserList(input: RenderFallbackBrowserListInput): boolean {
  return input.showFallbackBrowser && (input.browseLoading || input.hasData)
}
