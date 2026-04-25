'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Project, Task } from '@taskhelm/core'
import { ContextFileList } from '@/components/context-file-list'
import { ContextFilePreview } from '@/components/context-file-preview'
import { ContextVaultExplorer } from '@/components/context-vault-explorer'
import { DevServerPanel } from '@/components/dev-server-panel'
import { GlassButton } from '@/components/design-system/glass-button'
import { WorkspacePanel } from '@/components/workspace-panel'
import {
  discoverMarkdownFromNativeSelection,
  type NativeSelection,
} from '@/lib/context-vault/native-picker'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { resolveContextVaultSelection } from '@/lib/context-vault/selection'

interface ContextFileRecord {
  readonly relativePath: string
  readonly absolutePath: string
  readonly content: string | null
  readonly category?: PersistedContextVaultFile['category']
  readonly mediaType?: PersistedContextVaultFile['mediaType']
}

interface ContextVaultResponseFile {
  readonly relativePath: string
  readonly absolutePath: string
  readonly content: string | null
  readonly category?: PersistedContextVaultFile['category']
  readonly mediaType?: PersistedContextVaultFile['mediaType']
}

interface ContextVaultResponse {
  readonly rootPath: string | null
  readonly sources: readonly string[]
  readonly files: readonly ContextVaultResponseFile[]
  readonly selectedFile: string | null
}

const CONTEXT_VAULT_POLL_MS = 30000

type NativeLiveSelection = NativeSelection

interface TaskDetailPanelsProps {
  readonly task: Task
  readonly project: Project
}

export interface TaskDetailPanelsViewProps {
  readonly task: Task
  readonly project: Project
  readonly rootPath: string | null
  readonly sourceCount: number
  readonly files: readonly ContextFileRecord[]
  readonly selectedFile: string | null
  readonly statusMessage: string | null
  readonly fileListCollapsed?: boolean
  readonly forceLayoutMode?: 'desktop' | 'stacked'
  readonly forceFileListMode?: 'full' | 'popover' | 'collapsed'
  readonly loading?: boolean
  readonly error?: string | null
  readonly onSelectFile: (name: string) => void
  readonly onToggleFileListCollapse: () => void
  readonly onOpenExplorer: () => void
}

function mapVaultFiles(files: readonly ContextVaultResponseFile[]): readonly ContextFileRecord[] {
  return files.map(file => ({ ...file }))
}

export function TaskDetailPanelsView({
  task,
  project,
  rootPath,
  sourceCount,
  files,
  selectedFile,
  statusMessage,
  fileListCollapsed = false,
  forceLayoutMode,
  forceFileListMode,
  loading = false,
  error = null,
  onSelectFile,
  onToggleFileListCollapse,
  onOpenExplorer,
}: TaskDetailPanelsViewProps) {
  const selectedRecord = files.find(file => file.relativePath === selectedFile) ?? null
  const showInitialLoading = loading && files.length === 0
  const splitRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'stacked'>(forceLayoutMode ?? 'desktop')
  const [autoCompactList, setAutoCompactList] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (forceLayoutMode) {
      setLayoutMode(forceLayoutMode)
      return
    }

    const mediaQuery = window.matchMedia('(max-width: 1535px)')
    const sync = () => setLayoutMode(mediaQuery.matches ? 'stacked' : 'desktop')
    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [forceLayoutMode])

  useEffect(() => {
    const node = splitRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0
      setAutoCompactList(width > 0 && width < 980)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const fileListDisplayMode =
    forceFileListMode ??
    (layoutMode === 'stacked' ? 'popover' : fileListCollapsed ? 'collapsed' : autoCompactList ? 'popover' : 'full')

  useEffect(() => {
    if (fileListDisplayMode !== 'popover') {
      setPickerOpen(false)
    }
  }, [fileListDisplayMode])

  useEffect(() => {
    if (fileListDisplayMode !== 'popover' || !pickerOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPickerOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [fileListDisplayMode, pickerOpen])

  return (
    <div className="task-detail-grid" data-layout={layoutMode} style={{ minHeight: '400px' }}>
      <div className="task-detail-main" data-slot="task-detail-main">
        <div className="task-pane">
          <div className="task-pane-header">
            <div>
              <div className="task-pane-label">Context Vault</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Browse local context files, keep them linked to this task, and preview updates from disk in one workbench.
              </p>
            </div>
            <div className="context-vault-meta">
              <span className="context-vault-pill">Local only</span>
              <span>{files.length} file{files.length === 1 ? '' : 's'} tracked</span>
            </div>
          </div>

          <div className="task-pane-body flex flex-col gap-4">
            {showInitialLoading ? <p className="text-sm text-[var(--text-muted)]">Loading execution surface...</p> : null}
            {error ? <div className="utility-panel-error !mt-0">{error}</div> : null}
            {statusMessage ? (
              <div className="context-vault-browser-selection">
                <div className="task-pane-label">Status</div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">{statusMessage}</div>
              </div>
            ) : null}

            <div className="context-vault-state-card">
              <div>
                <div className="task-pane-label">
                  {rootPath ? 'Linked local source' : 'No local context linked yet'}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {rootPath
                    ? sourceCount > 0
                      ? `Tracking ${files.length} file${files.length === 1 ? '' : 's'} from ${sourceCount} linked local source${sourceCount === 1 ? '' : 's'}. TaskHelm refreshes from the linked local source every 30 seconds.`
                      : `Tracking ${files.length} file${files.length === 1 ? '' : 's'} from the active native picker selection. TaskHelm refreshes this selection every 30 seconds while this page stays open.`
                    : `Choose one local folder or one supported text, markdown, image, or video file. If the picker does not work on your machine, use a manual path and TaskHelm will refresh it every 30 seconds.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <GlassButton type="button" onClick={onOpenExplorer}>
                  {rootPath ? 'Update Vault' : 'Explore Context Vault'}
                </GlassButton>
              </div>
            </div>

            {rootPath ? (
              <div className="context-vault-browser-selection">
                <div className="task-pane-label">Local root</div>
                <div className="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">{rootPath}</div>
              </div>
            ) : null}

            <div
              ref={splitRef}
              className="context-vault-split"
              data-state={fileListDisplayMode}
              data-list-mode={fileListDisplayMode}
            >
              {fileListDisplayMode === 'full' || fileListDisplayMode === 'collapsed' ? (
                <div className="context-vault-sidebar">
                  <ContextFileList
                    files={files}
                    selectedFile={selectedFile}
                    displayMode={fileListDisplayMode}
                    onSelect={onSelectFile}
                    onToggleCollapse={onToggleFileListCollapse}
                  />
                </div>
              ) : null}
              <div className="context-vault-preview-pane" data-picker-mode={fileListDisplayMode}>
                {fileListDisplayMode === 'popover' ? (
                  <div className="context-vault-popover-anchor" ref={popoverRef}>
                    <button
                      type="button"
                      className="context-vault-popover-trigger"
                      aria-label="Open context file picker"
                      aria-expanded={pickerOpen}
                      onClick={() => setPickerOpen(current => !current)}
                    >
                      <span aria-hidden="true">🗂</span>
                    </button>
                    {pickerOpen ? (
                      <div className="context-vault-file-popover" role="dialog" aria-label="Context file picker">
                        <div className="context-vault-file-popover-header">
                          <div>
                            <div className="task-pane-label">Context Files</div>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {files.length} file{files.length === 1 ? '' : 's'} loaded
                            </p>
                          </div>
                          <button
                            type="button"
                            className="context-file-list-icon-toggle"
                            aria-label="Close context file picker"
                            onClick={() => setPickerOpen(false)}
                          >
                            <span aria-hidden="true">✕</span>
                          </button>
                        </div>
                        <ContextFileList
                          files={files}
                          selectedFile={selectedFile}
                          displayMode="full"
                          onSelect={onSelectFile}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <ContextFilePreview file={selectedRecord} files={files} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="task-detail-sidebar" data-slot="task-detail-sidebar">
        <WorkspacePanel task={task} />
        <DevServerPanel task={task} />
      </div>
    </div>
  )
}

export function TaskDetailPanels({ task, project }: TaskDetailPanelsProps) {
  const [files, setFiles] = useState<readonly ContextFileRecord[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(task.context_vault_selected_file)
  const [rootPath, setRootPath] = useState<string | null>(task.context_vault_root_path)
  const [sourceCount, setSourceCount] = useState(0)
  const [surfaceLoading, setSurfaceLoading] = useState(true)
  const [surfaceError, setSurfaceError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [explorerLoading, setExplorerLoading] = useState(false)
  const [explorerError, setExplorerError] = useState<string | null>(null)
  const [liveNativeSelection, setLiveNativeSelection] = useState<NativeLiveSelection | null>(null)
  const [fileListCollapsed, setFileListCollapsed] = useState(false)
  const selectedFileRef = useRef<string | null>(task.context_vault_selected_file)

  useEffect(() => {
    selectedFileRef.current = selectedFile
  }, [selectedFile])

  const applyVaultPayload = useCallback(
    (payload: ContextVaultResponse, options?: { preferredSelectedFile?: string | null }) => {
      const mappedFiles = mapVaultFiles(payload.files)
      const nextSelectedFile = resolveContextVaultSelection({
        files: mappedFiles,
        currentSelectedFile: options?.preferredSelectedFile ?? selectedFileRef.current,
        persistedSelectedFile: payload.selectedFile,
      })

      setFiles(mappedFiles)
      setSelectedFile(nextSelectedFile)
      setRootPath(payload.rootPath)
      setSourceCount(payload.sources.length)
      return {
        mappedFiles,
        nextSelectedFile,
      }
    },
    [],
  )

  const persistVaultSnapshot = useCallback(
    async (input: {
      readonly rootPath: string | null
      readonly sources: readonly string[]
      readonly files: readonly PersistedContextVaultFile[]
      readonly selectedFile: string | null
    }) => {
      const response = await fetch(`/api/tasks/${task.id}/context-vault`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = (await response.json()) as ContextVaultResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to persist context vault files')
      }

      applyVaultPayload(payload, { preferredSelectedFile: input.selectedFile })
      return payload
    },
    [applyVaultPayload, task.id],
  )

  const loadSurface = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setSurfaceLoading(true)
      }
      setSurfaceError(null)

      const vaultResponse = await fetch(`/api/tasks/${task.id}/context-vault`)
      const vaultPayload = (await vaultResponse.json()) as ContextVaultResponse & { error?: string }

      if (!vaultResponse.ok) {
        throw new Error(vaultPayload.error ?? 'Failed to load context vault')
      }

      applyVaultPayload(vaultPayload)
      setSurfaceLoading(false)
    },
    [applyVaultPayload, task.id],
  )

  useEffect(() => {
    let cancelled = false

    async function runInitialLoad() {
      try {
        await loadSurface()
      } catch (error) {
        if (!cancelled) {
          setSurfaceError((error as Error).message)
          setSurfaceLoading(false)
        }
      }
    }

    void runInitialLoad()

    return () => {
      cancelled = true
    }
  }, [loadSurface])

  useEffect(() => {
    let cancelled = false

    const interval = window.setInterval(() => {
      if (liveNativeSelection) {
        void discoverMarkdownFromNativeSelection(liveNativeSelection)
          .then(discovered => {
            if (cancelled) {
              return
            }

            const nextSelectedFile =
              discovered.files.find(file => file.relativePath === selectedFileRef.current)?.relativePath ??
              discovered.files[0]?.relativePath ??
              null

            return persistVaultSnapshot({
              rootPath: discovered.rootPath,
              sources: [],
              files: discovered.files,
              selectedFile: nextSelectedFile,
            })
          })
          .catch(error => {
            if (!cancelled) {
              setSurfaceError((error as Error).message)
            }
          })
        return
      }

      void loadSurface({ silent: true }).catch(error => {
        if (!cancelled) {
          setSurfaceError((error as Error).message)
        }
      })
    }, CONTEXT_VAULT_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [liveNativeSelection, loadSurface, persistVaultSnapshot])

  const handleExplore = useCallback(
    async (selectedPath: string) => {
      setExplorerLoading(true)
      setExplorerError(null)
      setSurfaceError(null)

      try {
        const discoverResponse = await fetch(`/api/tasks/${task.id}/context-vault/discover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: selectedPath }),
        })
        const discoverPayload = (await discoverResponse.json()) as {
          error?: string
          rootPath?: string | null
          files?: readonly ContextVaultResponseFile[]
        }

        if (!discoverResponse.ok) {
          throw new Error(discoverPayload.error ?? 'Failed to discover context files')
        }

        const discoveredFiles = discoverPayload.files ?? []
        const selectedRelativePath = discoveredFiles[0]?.relativePath ?? null
        const persisted = await persistVaultSnapshot({
          rootPath: discoverPayload.rootPath ?? null,
          sources: [selectedPath],
          files: discoveredFiles,
          selectedFile: selectedRelativePath,
        })

        setLiveNativeSelection(null)
        setExplorerOpen(false)
        setStatusMessage(
          persisted.files.length === 0
            ? 'No supported context files were found for this selection.'
            : `Loaded ${persisted.files.length} context file${persisted.files.length === 1 ? '' : 's'} from the linked local filesystem path.`,
        )
      } catch (error) {
        setExplorerError((error as Error).message)
      } finally {
        setExplorerLoading(false)
      }
    },
    [persistVaultSnapshot, task.id],
  )

  const handleExploreNative = useCallback(
    async (
      selection: NativeLiveSelection,
      discovered: {
        readonly rootPath: string
        readonly files: readonly PersistedContextVaultFile[]
      },
    ) => {
      setExplorerLoading(true)
      setExplorerError(null)
      setSurfaceError(null)

      try {
        const selectedRelativePath = discovered.files[0]?.relativePath ?? null
        const persisted = await persistVaultSnapshot({
          rootPath: discovered.rootPath,
          sources: [],
          files: discovered.files,
          selectedFile: selectedRelativePath,
        })

        setLiveNativeSelection(selection)
        setExplorerOpen(false)
        setStatusMessage(
          persisted.files.length === 0
            ? 'No supported context files were found for this selection.'
            : `Loaded ${persisted.files.length} context file${persisted.files.length === 1 ? '' : 's'} via the native picker. TaskHelm will refresh this selection every 30 seconds while this page stays open.`,
        )
      } catch (error) {
        setExplorerError((error as Error).message)
      } finally {
        setExplorerLoading(false)
      }
    },
    [persistVaultSnapshot],
  )

  const handleSelectFile = useCallback(
    (nextSelectedFile: string) => {
      setSelectedFile(nextSelectedFile)
      setSurfaceError(null)

      void fetch(`/api/tasks/${task.id}/context-vault`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedFile: nextSelectedFile }),
      }).catch(error => {
        setSurfaceError((error as Error).message)
      })
    },
    [task.id],
  )

  return (
    <>
      <TaskDetailPanelsView
        task={task}
        project={project}
        rootPath={rootPath}
        sourceCount={sourceCount}
        files={files}
        selectedFile={selectedFile}
        statusMessage={statusMessage}
        fileListCollapsed={fileListCollapsed}
        loading={surfaceLoading}
        error={surfaceError}
        onSelectFile={handleSelectFile}
        onToggleFileListCollapse={() => setFileListCollapsed(current => !current)}
        onOpenExplorer={() => {
          setExplorerError(null)
          setExplorerOpen(true)
        }}
      />

      <ContextVaultExplorer
        open={explorerOpen}
        loading={explorerLoading}
        error={explorerError}
        onClose={() => setExplorerOpen(false)}
        onExplore={selectedPath => {
          void handleExplore(selectedPath)
        }}
        onExploreNative={(selection, discovered) => {
          void handleExploreNative(selection, discovered)
        }}
      />
    </>
  )
}
