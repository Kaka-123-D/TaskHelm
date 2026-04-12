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
        bg-[var(--surface)] backdrop-blur-[var(--glass-blur)]
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
