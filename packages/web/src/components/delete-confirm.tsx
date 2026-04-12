'use client'

import { useState, useCallback } from 'react'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassButton } from '@/components/design-system/glass-button'

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

  return (
    <>
      <GlassButton variant="danger" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
        {label}
      </GlassButton>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Confirm Delete" maxWidth="max-w-sm">
        <p className="text-sm text-[var(--text-secondary)] mb-6">{confirmText}</p>
        <div className="flex justify-end gap-3">
          <GlassButton variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
          <GlassButton variant="danger" onClick={handleConfirm} loading={deleting}>Delete</GlassButton>
        </div>
      </GlassModal>
    </>
  )
}
