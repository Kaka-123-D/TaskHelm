'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassModal } from '@/components/design-system/glass-modal'
import {
  discoverMarkdownFromNativeSelection,
  type NativeDirectoryHandleLike,
  type NativeFileHandleLike,
  type NativeSelection,
} from '@/lib/context-vault/native-picker'
import { createNativePickerGate } from '@/lib/context-vault/native-picker-gate'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

interface ContextVaultExplorerProps {
  readonly open: boolean
  readonly loading: boolean
  readonly error: string | null
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
  onClose,
  onExplore,
  onExploreNative,
}: ContextVaultExplorerProps) {
  const [manualPath, setManualPath] = useState('')
  const [nativeLoading, setNativeLoading] = useState(false)
  const [nativeError, setNativeError] = useState<string | null>(null)
  const nativePickerGateRef = useRef(createNativePickerGate())

  const nativePickerWindow =
    typeof window === 'undefined'
      ? null
      : (window as Window & {
          showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
          showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
        })

  useEffect(() => {
    if (!open) {
      return
    }

    setNativeError(null)
    setManualPath('')
  }, [open])

  const mergedError = nativeError ?? error
  const selectedLabel = useMemo(() => {
    if (!manualPath.trim()) {
      return 'No manual path selected'
    }

    return manualPath.trim()
  }, [manualPath])

  const handleNativeSelection = useCallback(
    async (selection: NativeSelection) => {
      setNativeLoading(true)
      setNativeError(null)

      try {
        const discovered = await discoverMarkdownFromNativeSelection(selection)
        await onExploreNative?.(selection, discovered)
      } catch (selectionError) {
        setNativeError((selectionError as Error).message)
      } finally {
        setNativeLoading(false)
      }
    },
    [onExploreNative],
  )

  const chooseFolder = useCallback(async () => {
    const showDirectoryPicker = nativePickerWindow?.showDirectoryPicker

    if (!showDirectoryPicker) {
      setNativeError('System folder picker is not available in this browser. Use the local path field below instead.')
      return
    }

    await nativePickerGateRef.current.run(async () => {
      try {
        await handleNativeSelection({
          kind: 'directory',
          handle: (await showDirectoryPicker()) as unknown as NativeDirectoryHandleLike,
        })
      } catch (selectionError) {
        if ((selectionError as Error).name !== 'AbortError') {
          setNativeError((selectionError as Error).message)
        }
      }
    })
  }, [handleNativeSelection, nativePickerWindow])

  const chooseFile = useCallback(async () => {
    const showOpenFilePicker = nativePickerWindow?.showOpenFilePicker

    if (!showOpenFilePicker) {
      setNativeError('System file picker is not available in this browser. Use the local path field below instead.')
      return
    }

    await nativePickerGateRef.current.run(async () => {
      try {
        const [handle] = await showOpenFilePicker({
          excludeAcceptAllOption: false,
          multiple: false,
          types: [
            {
              description: 'Context files',
              accept: {
                'text/markdown': ['.md', '.mdx'],
                'text/plain': ['.txt', '.json', '.yml', '.yaml', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.xml', '.sh', '.bash', '.zsh', '.env', '.log', '.toml', '.ini', '.sql', '.csv'],
                'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'],
                'video/*': ['.mp4', '.webm', '.mov', '.m4v'],
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
      } catch (selectionError) {
        if ((selectionError as Error).name !== 'AbortError') {
          setNativeError((selectionError as Error).message)
        }
      }
    })
  }, [handleNativeSelection, nativePickerWindow])

  return (
    <GlassModal open={open} onClose={onClose} title="Explore Context Vault">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Use the system picker first to choose one folder or one supported text, markdown, image, or video file. TaskHelm will keep refreshing that linked local source every 30 seconds while this page stays open.
        </p>

        <div className="context-vault-browser-toolbar">
          <div className="context-vault-browser-path">
            <div className="task-pane-label">Selection mode</div>
            <div className="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">
              Native file system access
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => void chooseFolder()} loading={nativeLoading}>
              Choose folder
            </GlassButton>
            <GlassButton type="button" variant="secondary" onClick={() => void chooseFile()} loading={nativeLoading}>
              Choose file
            </GlassButton>
          </div>
        </div>

        <div className="context-vault-browser-selection">
          <div className="task-pane-label">Manual fallback</div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            If the system picker does not work on your machine, paste a local file or folder path below. TaskHelm will use that path for 30-second refresh polling.
          </p>
          <div className="mt-3">
            <GlassInput
              label="Local path"
              value={manualPath}
              onChange={event => setManualPath(event.target.value)}
              placeholder="/Users/you/Documents/project/docs"
            />
          </div>
        </div>

        {mergedError ? <div className="utility-panel-error !mt-0">{mergedError}</div> : null}

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
            onClick={() => onExplore(manualPath.trim())}
            loading={loading}
            disabled={!manualPath.trim()}
          >
            Update Vault
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  )
}
