import type { InputHTMLAttributes } from 'react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string
}

export function GlassInput({ label, className = '', id, ...props }: GlassInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs text-[var(--text-muted)] mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2 rounded-[var(--glass-radius-sm)]
          bg-[var(--surface)] border border-[var(--border)]
          text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
          focus:outline-none focus:border-[var(--primary)]
          transition-colors
          ${className}
        `}
        {...props}
      />
    </div>
  )
}
