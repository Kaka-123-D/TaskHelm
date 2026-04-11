'use client'

import { useState, useCallback } from 'react'

interface DeleteConfirmProps {
  readonly label: string
  readonly confirmText: string
  readonly onConfirm: () => Promise<void>
}

export function DeleteConfirm({ label, confirmText, onConfirm }: DeleteConfirmProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = useCallback(async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }, [onConfirm])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-lg transition-colors"
      >
        {label}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
        <p className="text-sm text-zinc-400 mb-6">{confirmText}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
