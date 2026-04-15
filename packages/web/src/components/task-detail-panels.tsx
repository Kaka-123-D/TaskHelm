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

const CONTEXT_VAULT_POLL_MS = 3000

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
  loading = false,
  error = null,
  onSelectFile,
  onToggleFileListCollapse,
  onOpenExplorer,
}: TaskDetailPanelsViewProps) {
  const selectedRecord = files.find(file => file.relativePath === selectedFile) ?? null
  const showInitialLoading = loading && files.length === 0

  return (
    <div className="task-detail-grid" style={{ minHeight: '400px' }}>
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
                  ? `Tracking ${files.length} file${files.length === 1 ? '' : 's'} from ${sourceCount} source${sourceCount === 1 ? '' : 's'}. TaskHelm re-reads local files every 3 seconds while this page stays open.`
                  : `Choose one local folder or one supported text, markdown, or image file. TaskHelm will poll the linked files from disk and refresh the preview when content changes.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <GlassButton type="button" onClick={onOpenExplorer}>
                {rootPath ? 'Change Context Vault' : 'Explore Context Vault'}
              </GlassButton>
            </div>
          </div>

          {rootPath ? (
            <div className="context-vault-browser-selection">
              <div className="task-pane-label">Local root</div>
              <div className="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">{rootPath}</div>
            </div>
          ) : null}

          <div className="context-vault-split" data-state={fileListCollapsed ? 'collapsed' : 'expanded'}>
            <div className="context-vault-sidebar">
              <ContextFileList
                files={files}
                selectedFile={selectedFile}
                collapsed={fileListCollapsed}
                onSelect={onSelectFile}
                onToggleCollapse={onToggleFileListCollapse}
              />
            </div>
            <div className="context-vault-preview-pane">
              <ContextFilePreview file={selectedRecord} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
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
  const [explorerSeedPath, setExplorerSeedPath] = useState(task.context_vault_root_path ?? '')
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
      setExplorerSeedPath(payload.rootPath ?? '')
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
        const persistPayload = await persistVaultSnapshot({
          rootPath: discoverPayload.rootPath ?? null,
          sources: [selectedPath],
          files: discoveredFiles,
          selectedFile: selectedRelativePath,
        })

        setLiveNativeSelection(null)
        setExplorerOpen(false)
        setStatusMessage(
          persistPayload.files.length === 0
            ? 'No supported context files were found for this selection.'
            : `Loaded ${persistPayload.files.length} context file${persistPayload.files.length === 1 ? '' : 's'} from the local filesystem.`,
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
            : `Loaded ${persisted.files.length} context file${persisted.files.length === 1 ? '' : 's'} via the native picker. TaskHelm will keep refreshing this selection while the page stays open.`,
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
        initialPath={explorerSeedPath}
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
