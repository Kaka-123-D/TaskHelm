'use client'

import { motion } from 'motion/react'

interface FilterOption {
  readonly value: string
  readonly label: string
  readonly count?: number
}

interface FilterPillsProps {
  readonly options: readonly FilterOption[]
  readonly value: string
  readonly onChange: (value: string) => void
}

export function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="relative rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              color: isActive ? 'var(--accent-ink)' : 'var(--text-secondary)',
              borderColor: isActive ? 'rgba(47, 109, 246, 0.15)' : 'var(--border)',
              background: isActive ? 'transparent' : 'rgba(255,255,255,0.46)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="active-filter-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--accent-muted)', border: '1px solid rgba(47,109,246,0.16)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">
              {option.label}
              {option.count !== undefined && (
                <span className="ml-1 opacity-70">{option.count}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
