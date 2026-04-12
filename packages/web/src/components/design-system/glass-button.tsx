'use client'

import { motion } from 'motion/react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

// Omit motion-conflicting event handlers from native ButtonHTMLAttributes
type SafeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver' | 'onDragStart' | 'onAnimationStart'
>

interface GlassButtonProps extends SafeButtonProps {
  readonly children: ReactNode
  readonly variant?: Variant
  readonly loading?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white',
  secondary: 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-primary)]',
  ghost: 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  danger: 'bg-[var(--danger-bg)] hover:bg-[rgba(239,68,68,0.25)] border border-[rgba(239,68,68,0.3)] text-[var(--danger-hover)]',
}

export function GlassButton({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      className={`
        px-4 py-2 rounded-[var(--glass-radius-sm)] text-sm font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
      whileTap={{ scale: 0.97 }}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </motion.button>
  )
}
