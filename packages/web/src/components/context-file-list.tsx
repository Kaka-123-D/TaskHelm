'use client'

import { motion } from 'motion/react'
import { classifyContextVaultFile } from '@/lib/context-vault/file-preview'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { buildContextVaultTree, type ContextVaultTreeNode } from '@/lib/context-vault/tree'

interface ContextFileListProps {
  readonly files: readonly PersistedContextVaultFile[]
  readonly selectedFile: string | null
  readonly collapsed?: boolean
  readonly onSelect: (name: string) => void
  readonly onToggleCollapse?: () => void
}

export function ContextFileList({
  files,
  selectedFile,
  collapsed = false,
  onSelect,
  onToggleCollapse,
}: ContextFileListProps) {
  if (files.length === 0) {
    return (
      <div className="context-file-list-shell" data-state={collapsed ? 'collapsed' : 'expanded'}>
        <div className="context-file-list-header">
          <div>
            <div className="task-pane-label">Context Files</div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">0 files loaded</p>
          </div>
          {onToggleCollapse ? (
            <button type="button" className="context-file-list-toggle" onClick={onToggleCollapse}>
              {collapsed ? 'Expand list' : 'Collapse list'}
            </button>
          ) : null}
        </div>
        <div className="context-vault-empty flex-1">
          <p className="text-sm text-[var(--text-secondary)]">No context files selected yet.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Explore Context Vault to attach local text, markdown, or image files to this task.
          </p>
        </div>
      </div>
    )
  }

  const tree = buildContextVaultTree(files)

  return (
    <div className="context-file-list-shell" data-state={collapsed ? 'collapsed' : 'expanded'}>
      <div className="context-file-list-header">
        <div>
          <div className="task-pane-label">Context Files</div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {files.length} file{files.length === 1 ? '' : 's'} loaded
          </p>
        </div>
        {onToggleCollapse ? (
          <button type="button" className="context-file-list-toggle" onClick={onToggleCollapse}>
            {collapsed ? 'Expand list' : 'Collapse list'}
          </button>
        ) : null}
      </div>
      {collapsed ? null : (
        <div className="context-file-list-panel">
          {tree.map(node => (
            <ContextFileTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ContextFileTreeNode({
  node,
  depth,
  selectedFile,
  onSelect,
}: {
  readonly node: ContextVaultTreeNode
  readonly depth: number
  readonly selectedFile: string | null
  readonly onSelect: (name: string) => void
}) {
  if (node.kind === 'folder') {
    return (
      <div className="context-file-tree-folder" data-depth={depth}>
        <div className="context-file-tree-folder-label" style={{ paddingLeft: `${depth * 0.85}rem` }}>
          <span className="text-xs text-[var(--text-muted)]">▾</span>
          <span className="truncate">{node.name}</span>
        </div>
        <div className="context-file-tree-children">
          {node.children.map(child => (
            <ContextFileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
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
    <motion.button
      type="button"
      onClick={() => onSelect(file.relativePath)}
      className="context-file-list-item"
      data-state={isSelected ? 'selected' : 'idle'}
      style={{ marginLeft: `${depth * 0.85}rem` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--accent)]">
            {resolvedCategory === 'image' ? '🖼' : resolvedCategory === 'markdown' ? '📝' : '📄'}
          </span>
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">{node.name}</span>
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">
          {file.relativePath}
        </div>
      </div>
      <span className="context-vault-bind-badge">{badge}</span>
    </motion.button>
  )
}
