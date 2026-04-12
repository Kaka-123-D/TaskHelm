'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassButton } from '@/components/design-system/glass-button'
import { GlassModal } from '@/components/design-system/glass-modal'

interface DirEntry {
  readonly name: string
  readonly path: string
  readonly isGitRepo: boolean
}

interface BrowseResult {
  readonly current: string
  readonly parent: string
  readonly isGitRepo: boolean
  readonly gitRoot: string | null
  readonly dirs: readonly DirEntry[]
}

interface FolderPickerProps {
  readonly value: string
  readonly onChange: (path: string) => void
}

export function FolderPicker({ value, onChange }: FolderPickerProps) {
  const [open, setOpen] = useState(false)
  const [browsePath, setBrowsePath] = useState<string>('')
  const [data, setData] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const browse = useCallback(async (dirPath?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''
      const res = await fetch(`/api/fs/browse${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to browse')
      }
      const result: BrowseResult = await res.json()
      setData(result)
      setBrowsePath(result.current)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) browse(value || undefined)
  }, [open, value, browse])

  const handleSelect = useCallback(() => {
    onChange(browsePath)
    setOpen(false)
  }, [browsePath, onChange])

  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          placeholder="Click Browse to select a folder"
          className="flex-1 px-3 py-2 rounded-[var(--glass-radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <GlassButton type="button" variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-2">
          Browse
        </GlassButton>
      </div>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Select Repository Folder">
        {/* Path input */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={browsePath}
            onChange={e => setBrowsePath(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') browse(browsePath) }}
            className="flex-1 px-3 py-1.5 rounded-[var(--glass-radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          />
          <GlassButton type="button" variant="secondary" onClick={() => browse(browsePath)} className="text-xs px-3 py-1.5">
            Go
          </GlassButton>
        </div>

        {/* Git indicator */}
        {data?.isGitRepo && (
          <div className="mb-3 px-3 py-2 rounded-[var(--glass-radius-sm)] text-xs flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--status-done)' }}>
            Git repository detected
          </div>
        )}

        {error && (
          <div className="mb-3 p-2 rounded-[var(--glass-radius-sm)] text-xs" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
            {error}
          </div>
        )}

        {/* Directory listing */}
        <div className="rounded-[var(--glass-radius-sm)] border overflow-hidden mb-4 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          {data && data.current !== data.parent && (
            <button
              type="button"
              onClick={() => browse(data.parent)}
              className="w-full px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span>..</span>
              <span className="text-xs text-[var(--text-muted)]">(parent)</span>
            </button>
          )}

          {loading && <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">Loading...</div>}

          {!loading && data?.dirs.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">No subdirectories</div>
          )}

          {!loading && data?.dirs.map(dir => (
            <button
              key={dir.path}
              type="button"
              onClick={() => browse(dir.path)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[var(--text-primary)]">{dir.name}</span>
              {dir.isGitRepo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-done)' }}>git</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <GlassButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
          <GlassButton type="button" onClick={handleSelect}>Select This Folder</GlassButton>
        </div>
      </GlassModal>
    </>
  )
}
