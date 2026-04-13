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
        <label htmlFor={selectId} className="mb-1.5 block text-xs text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full rounded-[var(--glass-radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5
          text-sm text-[var(--text-primary)]
          focus:border-[var(--accent)] focus:outline-none
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
