'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface GlassModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
  readonly maxWidth?: string
}

export function GlassModal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: GlassModalProps) {
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            className={`
              relative ${maxWidth} w-full mx-4
              bg-[var(--bg-deep)] border border-[var(--border-hover)]
              rounded-[var(--glass-radius-lg)] p-6 shadow-2xl
            `}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
