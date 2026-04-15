'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassModal } from '@/components/design-system/glass-modal'
import {
  discoverMarkdownFromNativeSelection,
  type NativeDirectoryHandleLike,
  type NativeFileHandleLike,
  type NativeSelection,
} from '@/lib/context-vault/native-picker'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

interface DirEntry {
  readonly name: string
  readonly path: string
  readonly isGitRepo: boolean
}

interface FileEntry {
  readonly name: string
  readonly path: string
  readonly category?: string
}

interface BrowseResult {
  readonly current: string
  readonly parent: string
  readonly isGitRepo: boolean
  readonly gitRoot: string | null
  readonly dirs: readonly DirEntry[]
  readonly files: readonly FileEntry[]
}

interface ContextVaultExplorerProps {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string | null
  readonly initialPath: string
  readonly onClose: () => void
  readonly onExplore: (selectedPath: string) => void
  readonly onExploreNative?: (
    selection: NativeSelection,
    discovered: {
      readonly rootPath: string
      readonly files: readonly PersistedContextVaultFile[]
    },
  ) => void
}

export function ContextVaultExplorer({
  open,
  loading,
  error,
  initialPath,
  onClose,
  onExplore,
  onExploreNative,
}: ContextVaultExplorerProps) {
  const [browsePath, setBrowsePath] = useState<string>('')
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [data, setData] = useState<BrowseResult | null>(null)
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseError, setBrowseError] = useState<string | null>(null)
  const [nativeLoading, setNativeLoading] = useState(false)
  const [nativeError, setNativeError] = useState<string | null>(null)
  const [showFallbackBrowser, setShowFallbackBrowser] = useState(false)

  const nativePickerWindow =
    typeof window === 'undefined'
      ? null
      : (window as Window & {
          showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
          showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
        })
  const nativeSupported = Boolean(nativePickerWindow?.showDirectoryPicker || nativePickerWindow?.showOpenFilePicker)

  const browse = useCallback(async (targetPath?: string) => {
    setBrowseLoading(true)
    setBrowseError(null)

    try {
      const params = targetPath ? `?path=${encodeURIComponent(targetPath)}` : ''
      const response = await fetch(`/api/fs/browse${params}`)
      const payload = (await response.json()) as BrowseResult & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to browse local files')
      }

      setData(payload)
      setBrowsePath(payload.current)
      setSelectedPath(previousSelection => {
        if (previousSelection && previousSelection.startsWith(`${payload.current}/`)) {
          return previousSelection
        }

        return payload.current
      })
    } catch (err) {
      setBrowseError((err as Error).message)
    } finally {
      setBrowseLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    setNativeError(null)
    setBrowseError(null)
    setShowFallbackBrowser(!nativeSupported)
    void browse(initialPath || undefined)
  }, [browse, initialPath, nativeSupported, open])

  const mergedError = nativeError ?? browseError ?? error
  const selectedLabel = useMemo(() => {
    if (!selectedPath) {
      return 'No selection yet'
    }

    return selectedPath
  }, [selectedPath])

  const handleNativeSelection = useCallback(
    async (selection: NativeSelection) => {
      setNativeLoading(true)
      setNativeError(null)

      try {
        const discovered = await discoverMarkdownFromNativeSelection(selection)
        setSelectedPath(discovered.rootPath)
        onExploreNative?.(selection, discovered)
      } catch (err) {
        setNativeError((err as Error).message)
      } finally {
        setNativeLoading(false)
      }
    },
    [onExploreNative],
  )

  const chooseFolder = useCallback(async () => {
    if (!nativePickerWindow?.showDirectoryPicker) {
      setShowFallbackBrowser(true)
      setNativeError('Native folder picker is not available in this browser. Use the fallback browser below.')
      return
    }

    try {
      await handleNativeSelection({
        kind: 'directory',
        handle: (await nativePickerWindow.showDirectoryPicker()) as unknown as NativeDirectoryHandleLike,
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setNativeError((err as Error).message)
      }
    }
  }, [handleNativeSelection, nativePickerWindow])

  const chooseFile = useCallback(async () => {
    if (!nativePickerWindow?.showOpenFilePicker) {
      setShowFallbackBrowser(true)
      setNativeError('Native file picker is not available in this browser. Use the fallback browser below.')
      return
    }

    try {
      const [handle] = await nativePickerWindow.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: false,
        types: [
          {
            description: 'Context files',
            accept: {
              'text/markdown': ['.md', '.mdx'],
              'text/plain': ['.txt', '.json', '.yml', '.yaml', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.xml', '.sh', '.bash', '.zsh', '.env', '.log', '.toml', '.ini', '.sql', '.csv'],
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
            },
          },
        ],
      })

      if (!handle) {
        return
      }

      await handleNativeSelection({
        kind: 'file',
        handle: handle as unknown as NativeFileHandleLike,
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setNativeError((err as Error).message)
      }
    }
  }, [handleNativeSelection, nativePickerWindow])

  return (
    <GlassModal open={open} onClose={onClose} title="Explore Context Vault">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Use the native system picker to choose either one folder or one supported text, markdown, or image file. TaskHelm will keep the selected context files in the task vault and refresh native selections while this page stays open.
        </p>

        <div className="context-vault-browser-toolbar">
          <div className="context-vault-browser-path">
            <div className="task-pane-label">Selection mode</div>
            <div className="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">
              {nativeSupported ? 'Native picker ready' : 'Fallback browser mode'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => void chooseFolder()} loading={nativeLoading}>
              Choose folder
            </GlassButton>
            <GlassButton
              type="button"
              variant="secondary"
              onClick={() => void chooseFile()}
              loading={nativeLoading}
            >
              Choose file
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={() => setShowFallbackBrowser(value => !value)}>
              {showFallbackBrowser ? 'Hide fallback browser' : 'Use fallback browser'}
            </GlassButton>
          </div>
        </div>

        {showFallbackBrowser && data?.isGitRepo ? (
          <div
            className="rounded-[var(--glass-radius-sm)] border px-3 py-2 text-xs"
            style={{
              background: 'var(--status-done-bg)',
              borderColor: 'rgba(45, 155, 106, 0.16)',
              color: 'var(--status-done)',
            }}
          >
            Git repository detected
          </div>
        ) : null}

        {mergedError ? <div className="utility-panel-error !mt-0">{mergedError}</div> : null}

        {showFallbackBrowser ? (
          <div className="context-vault-browser-list">
            {data && data.current !== data.parent ? (
              <button
                type="button"
                onClick={() => void browse(data.parent)}
                className="context-vault-browser-row context-vault-browser-row--muted"
              >
                <span>..</span>
                <span className="text-xs text-[var(--text-muted)]">(parent)</span>
              </button>
            ) : null}

            {browseLoading ? <div className="context-vault-empty">Loading local filesystem...</div> : null}

            {!browseLoading && data?.dirs.map(dir => (
              <button
                key={dir.path}
                type="button"
                onClick={() => void browse(dir.path)}
                className="context-vault-browser-row"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-primary)]">{dir.name}</div>
                  <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">{dir.path}</div>
                </div>
                {dir.isGitRepo ? <span className="context-vault-bind-badge">git</span> : null}
              </button>
            ))}

            {!browseLoading && data?.files.map(file => {
              const isSelected = selectedPath === file.path
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className="context-vault-browser-row"
                  data-state={isSelected ? 'selected' : 'idle'}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)]">{file.name}</div>
                    <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">{file.path}</div>
                  </div>
                  <span className="context-vault-bind-badge">{file.category ?? 'file'}</span>
                </button>
              )
            })}

            {!browseLoading && data && data.dirs.length === 0 && data.files.length === 0 ? (
              <div className="context-vault-empty">
                <p className="text-sm text-[var(--text-secondary)]">No folders or supported files found here.</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="context-vault-browser-selection">
          <div className="task-pane-label">Selected source</div>
          <div className="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">{selectedLabel}</div>
        </div>

        <div className="flex justify-end gap-3">
          <GlassButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            type="button"
            onClick={() => onExplore(selectedPath)}
            loading={loading}
            disabled={!selectedPath.trim()}
          >
            Load Context Files
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  )
}
