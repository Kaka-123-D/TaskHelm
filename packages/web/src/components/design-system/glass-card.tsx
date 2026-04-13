'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface GlassCardProps {
  readonly children: ReactNode
  readonly className?: string
  readonly hover?: boolean
  readonly onClick?: () => void
}

export function GlassCard({ children, className = '', hover = true, onClick }: GlassCardProps) {
  return (
    <motion.div
      className={`
        rounded-[var(--glass-radius)] border border-[var(--border)]
        bg-[var(--surface)] shadow-[var(--shadow-card)]
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={hover ? { scale: 1.01, y: -3 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
