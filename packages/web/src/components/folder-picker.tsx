'use client'

import { useState, useEffect, useCallback } from 'react'

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
    if (open) {
      browse(value || undefined)
    }
  }, [open, value, browse])

  const handleSelect = useCallback(() => {
    onChange(browsePath)
    setOpen(false)
  }, [browsePath, onChange])

  if (!open) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          placeholder="Click Browse to select a folder"
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200 rounded-lg transition-colors whitespace-nowrap"
        >
          Browse
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-full max-w-lg shadow-2xl">
        <h3 className="text-lg font-semibold mb-3">Select Repository Folder</h3>

        {/* Current path */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={browsePath}
            onChange={(e) => setBrowsePath(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') browse(browsePath) }}
            className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => browse(browsePath)}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-200 rounded transition-colors"
          >
            Go
          </button>
        </div>

        {/* Git indicator */}
        {data?.isGitRepo && (
          <div className="mb-3 px-3 py-2 bg-green-900/20 border border-green-800/40 rounded text-xs text-green-400 flex items-center gap-2">
            <span>Git repository detected</span>
          </div>
        )}

        {error && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Directory listing */}
        <div className="border border-zinc-700 rounded-lg overflow-hidden mb-4 max-h-64 overflow-y-auto">
          {/* Parent directory */}
          {data && data.current !== data.parent && (
            <button
              type="button"
              onClick={() => browse(data.parent)}
              className="w-full px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors border-b border-zinc-800 flex items-center gap-2"
            >
              <span className="text-zinc-600">..</span>
              <span className="text-xs text-zinc-600">(parent)</span>
            </button>
          )}

          {loading && (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">Loading...</div>
          )}

          {!loading && data?.dirs.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-zinc-500">No subdirectories</div>
          )}

          {!loading && data?.dirs.map(dir => (
            <button
              key={dir.path}
              type="button"
              onClick={() => browse(dir.path)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0 flex items-center gap-2"
            >
              <span className="text-zinc-300">{dir.name}</span>
              {dir.isGitRepo && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded">git</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelect}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  )
}
