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
    <div className="flex gap-1.5 flex-wrap">
      {options.map(option => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="relative px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              color: isActive ? 'var(--primary-hover)' : 'var(--text-muted)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="active-filter-pill"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--primary-muted)', border: '1px solid rgba(99,102,241,0.2)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
