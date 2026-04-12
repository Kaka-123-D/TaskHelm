'use client'

import { motion } from 'motion/react'

interface ContextFile {
  readonly name: string
  readonly content: string | null
}

interface ContextFileListProps {
  readonly files: readonly ContextFile[]
  readonly selectedFile: string | null
  readonly onSelect: (name: string) => void
  readonly specdownUrl: string | null
}

export function ContextFileList({ files, selectedFile, onSelect, specdownUrl }: ContextFileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--text-muted)]">No context files yet.</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Initialize workspace to create task capsule.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {files.map(file => {
        const isSelected = file.name === selectedFile
        return (
          <motion.button
            key={file.name}
            onClick={() => onSelect(file.name)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--glass-radius-sm)] border text-left transition-colors"
            style={{
              background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
              borderColor: isSelected ? 'var(--border-hover)' : 'var(--border)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-[var(--primary)] text-sm">&#128196;</span>
            <span className="text-sm text-[var(--text-primary)] flex-1">{file.name}</span>
            {specdownUrl && (
              <a
                href={specdownUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] underline transition-colors"
                onClick={e => e.stopPropagation()}
              >
                Open in SpecDown
              </a>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
