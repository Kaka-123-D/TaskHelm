'use client'

import { useEffect, useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'

interface GlassModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
  readonly maxWidth?: string
}

export function GlassModal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: GlassModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-[rgba(71,53,28,0.18)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`
              relative ${maxWidth} mx-4 w-full overflow-hidden
              rounded-[var(--glass-radius-lg)] border border-[var(--border-hover)]
              bg-[var(--surface-elevated)] p-0 shadow-[var(--shadow-window)]
            `}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-6 py-4">
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Editor Sheet</div>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  if (!mounted) {
    return null
  }

  return createPortal(modal, document.body)
}
