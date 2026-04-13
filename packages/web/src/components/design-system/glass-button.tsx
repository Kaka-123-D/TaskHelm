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
  primary:
    'border border-[rgba(245,166,35,0.28)] bg-[var(--primary)] text-[var(--primary-ink)] shadow-[0_10px_22px_rgba(245,166,35,0.22)] hover:bg-[var(--primary-hover)]',
  secondary:
    'border border-[var(--border)] bg-[rgba(255,255,255,0.7)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--surface)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
  danger:
    'border border-[rgba(204,80,56,0.18)] bg-[var(--danger-bg)] text-[var(--danger-hover)] hover:bg-[#ffd7d0]',
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
        inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--glass-radius-sm)] text-sm font-semibold
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
