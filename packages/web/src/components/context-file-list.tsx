'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { classifyContextVaultFile } from '@/lib/context-vault/file-preview'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { buildContextVaultTree, type ContextVaultTreeNode } from '@/lib/context-vault/tree'
import {
  createInitialExpandedFolders,
  reconcileExpandedFolders,
} from '@/lib/context-vault/tree-state'

interface ContextFileListProps {
  readonly files: readonly PersistedContextVaultFile[]
  readonly selectedFile: string | null
  readonly displayMode?: 'full' | 'compact' | 'collapsed'
  readonly onSelect: (name: string) => void
  readonly onToggleCollapse?: () => void
}

export function ContextFileList({
  files,
  selectedFile,
  displayMode = 'full',
  onSelect,
  onToggleCollapse,
}: ContextFileListProps) {
  const tree = useMemo(() => buildContextVaultTree(files), [files])
  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree])
  const didInitializeFolders = useRef(folderPaths.length > 0)
  const [expandedFolders, setExpandedFolders] = useState<ReadonlySet<string>>(() =>
    createInitialExpandedFolders(folderPaths, selectedFile),
  )

  useEffect(() => {
    setExpandedFolders(current => {
      if (!didInitializeFolders.current && folderPaths.length > 0) {
        didInitializeFolders.current = true
        return createInitialExpandedFolders(folderPaths, selectedFile)
      }

      return reconcileExpandedFolders(current, folderPaths)
    })
  }, [folderPaths, selectedFile])

  const isCollapsed = displayMode === 'collapsed'
  const isCompact = displayMode === 'compact'
  const showHeader = !isCompact

  if (files.length === 0) {
    return (
      <div className="context-file-list-shell" data-state={displayMode}>
        {showHeader ? (
          <div className="context-file-list-header">
            <div>
              <div className="task-pane-label">Context Files</div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">0 files loaded</p>
            </div>
            {onToggleCollapse ? (
              <button
                type="button"
                className="context-file-list-icon-toggle"
                aria-label={isCollapsed ? 'Expand file list' : 'Collapse file list'}
                onClick={onToggleCollapse}
              >
                <span aria-hidden="true">{isCollapsed ? '⟫' : '⟪'}</span>
              </button>
            ) : null}
          </div>
        ) : null}
        {!showHeader && onToggleCollapse ? (
          <button
            type="button"
            className="context-file-list-icon-toggle context-file-list-icon-toggle--inline"
            aria-label={isCollapsed ? 'Expand file list' : 'Collapse file list'}
            onClick={onToggleCollapse}
          >
            <span aria-hidden="true">{isCollapsed ? '⟫' : '⟪'}</span>
          </button>
        ) : null}
        <div className="context-vault-empty flex-1">
          <p className="text-sm text-[var(--text-secondary)]">No context files selected yet.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Explore Context Vault to attach local text, markdown, or image files to this task.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="context-file-list-shell" data-state={displayMode}>
      {showHeader ? (
        <div className="context-file-list-header">
          <div>
            <div className="task-pane-label">Context Files</div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {files.length} file{files.length === 1 ? '' : 's'} loaded
            </p>
          </div>
          {onToggleCollapse ? (
            <button
              type="button"
              className="context-file-list-icon-toggle"
              aria-label={isCollapsed ? 'Expand file list' : 'Collapse file list'}
              onClick={onToggleCollapse}
            >
              <span aria-hidden="true">{isCollapsed ? '⟫' : '⟪'}</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {!showHeader && onToggleCollapse ? (
        <button
          type="button"
          className="context-file-list-icon-toggle context-file-list-icon-toggle--inline"
          aria-label={isCollapsed ? 'Expand file list' : 'Collapse file list'}
          onClick={onToggleCollapse}
        >
          <span aria-hidden="true">{isCollapsed ? '⟫' : '⟪'}</span>
        </button>
      ) : null}
      {isCollapsed ? null : (
        <div className="context-file-list-panel">
          {tree.map(node => (
            <ContextFileTreeNode
              key={node.path}
              node={node}
              depth={0}
              compact={isCompact}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggleFolder={folderPath =>
                setExpandedFolders(current => {
                  const next = new Set(current)
                  if (next.has(folderPath)) {
                    next.delete(folderPath)
                  } else {
                    next.add(folderPath)
                  }
                  return next
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function collectFolderPaths(nodes: readonly ContextVaultTreeNode[]): readonly string[] {
  const folderPaths: string[] = []

  function walk(currentNodes: readonly ContextVaultTreeNode[]) {
    for (const node of currentNodes) {
      if (node.kind !== 'folder') {
        continue
      }

      folderPaths.push(node.path)
      walk(node.children)
    }
  }

  walk(nodes)
  return folderPaths
}

function ContextFileTreeNode({
  node,
  depth,
  compact,
  selectedFile,
  expandedFolders,
  onSelect,
  onToggleFolder,
}: {
  readonly node: ContextVaultTreeNode
  readonly depth: number
  readonly compact: boolean
  readonly selectedFile: string | null
  readonly expandedFolders: ReadonlySet<string>
  readonly onSelect: (name: string) => void
  readonly onToggleFolder: (folderPath: string) => void
}) {
  const treeNodeStyle = { '--tree-depth': depth } as CSSProperties

  if (node.kind === 'folder') {
    const isExpanded = expandedFolders.has(node.path)

    return (
      <div
        className="context-file-tree-node context-file-tree-folder"
        data-depth={depth}
        style={treeNodeStyle}
      >
        {depth > 0 ? <span className="context-file-tree-branch" aria-hidden="true" /> : null}
        <button
          type="button"
          className="context-file-tree-row"
          data-node-kind="folder"
          data-mode={compact ? 'compact' : 'full'}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse folder ${node.path}` : `Expand folder ${node.path}`}
          onClick={() => onToggleFolder(node.path)}
          title={compact ? node.path : undefined}
          style={{ marginLeft: `${depth * 1.25}rem` }}
        >
          <span className="context-file-tree-icon" aria-hidden="true">
            {isExpanded ? '📂' : '📁'}
          </span>
          {compact ? null : <span className="truncate">{node.name}</span>}
        </button>
        {isExpanded ? (
          <div className="context-file-tree-children">
            <span className="context-file-tree-rail" aria-hidden="true" />
            {node.children.map(child => (
              <ContextFileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                compact={compact}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const file = node.file
  const isSelected = file.relativePath === selectedFile
  const resolvedCategory = file.category ?? classifyContextVaultFile(file.relativePath).category
  const badge =
    resolvedCategory === 'markdown'
      ? 'md'
      : resolvedCategory === 'image'
        ? 'img'
        : resolvedCategory === 'text'
          ? 'txt'
          : 'file'

  return (
    <div className="context-file-tree-node" data-depth={depth} style={treeNodeStyle}>
      {depth > 0 ? <span className="context-file-tree-branch" aria-hidden="true" /> : null}
      <motion.button
        type="button"
        onClick={() => onSelect(file.relativePath)}
        className="context-file-tree-row"
        data-node-kind="file"
        data-mode={compact ? 'compact' : 'full'}
        data-state={isSelected ? 'selected' : 'idle'}
        aria-label={`File ${file.relativePath}`}
        title={file.relativePath}
        style={{ marginLeft: `${depth * 1.25}rem` }}
      >
        <ContextFileTreeIcon file={file} category={resolvedCategory} />
        {compact ? null : (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">{node.name}</span>
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">
                {file.relativePath}
              </div>
            </div>
            <span className="context-vault-bind-badge">{badge}</span>
          </>
        )}
      </motion.button>
    </div>
  )
}

function ContextFileTreeIcon({
  file,
  category,
}: {
  readonly file: PersistedContextVaultFile
  readonly category: ReturnType<typeof classifyContextVaultFile>['category']
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageSrc =
    category === 'image' && !imageFailed && file.content && file.content.length > 0
      ? file.content
      : null

  if (imageSrc) {
    return (
      <span className="context-file-tree-icon context-file-tree-icon--thumbnail" aria-hidden="true">
        <img
          src={imageSrc}
          alt=""
          className="context-file-tree-thumbnail"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </span>
    )
  }

  return (
    <span className="context-file-tree-icon" aria-hidden="true">
      {category === 'image' ? '🖼' : category === 'markdown' ? '📝' : '📄'}
    </span>
  )
}
