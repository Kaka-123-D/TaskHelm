import type { SelectHTMLAttributes } from 'react'

interface Option {
  readonly value: string
  readonly label: string
}

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string
  readonly options: readonly Option[]
}

export function GlassSelect({ label, options, className = '', id, ...props }: GlassSelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-xs text-[var(--text-muted)] mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-[var(--glass-radius-sm)]
          bg-[var(--surface)] border border-[var(--border)]
          text-sm text-[var(--text-primary)]
          focus:outline-none focus:border-[var(--primary)]
          transition-colors
          ${className}
        `}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
