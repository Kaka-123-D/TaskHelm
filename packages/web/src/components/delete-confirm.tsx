'use client'

import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassButton } from '@/components/design-system/glass-button'

interface DeleteConfirmProps {
  readonly label: string
  readonly confirmText: string
  readonly onConfirm: () => Promise<void>
  readonly renderTrigger?: (props: { open: () => void; deleting: boolean }) => ReactNode
  readonly redirectHref?: string
}

export function DeleteConfirm({ label, confirmText, onConfirm, renderTrigger, redirectHref }: DeleteConfirmProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openDialog = useCallback(() => {
    setError(null)
    setOpen(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    setDeleting(true)
    try {
      await onConfirm()
      setError(null)
      setOpen(false)
      if (redirectHref) {
        router.push(redirectHref)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }, [onConfirm, redirectHref, router])

  const handleClose = useCallback(() => {
    setOpen(false)
    setError(null)
  }, [])

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: openDialog, deleting })
      ) : (
        <GlassButton variant="danger" onClick={openDialog} className="text-xs px-3 py-1.5">
          {label}
        </GlassButton>
      )}

      <GlassModal open={open} onClose={handleClose} title="Confirm Delete" maxWidth="max-w-sm">
        <p className="text-sm text-[var(--text-secondary)] mb-6">{confirmText}</p>
        {error && (
          <div className="mb-4 rounded-[var(--glass-radius-sm)] border p-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)', borderColor: 'rgba(204, 80, 56, 0.18)' }}>
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <GlassButton variant="ghost" onClick={handleClose}>Cancel</GlassButton>
          <GlassButton variant="danger" onClick={handleConfirm} loading={deleting}>Delete</GlassButton>
        </div>
      </GlassModal>
    </>
  )
}
