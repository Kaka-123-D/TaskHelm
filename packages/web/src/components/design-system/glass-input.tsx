import type { InputHTMLAttributes } from 'react'

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string
  readonly helperText?: string
}

export function GlassInput({ label, helperText, className = '', id, ...props }: GlassInputProps) {
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
          w-full rounded-[var(--glass-radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5
          text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
          focus:border-[var(--accent)] focus:outline-none
          transition-colors
          ${className}
        `}
        {...props}
      />
      {helperText && (
        <p className="mt-1.5 text-[0.7rem] leading-snug text-[var(--text-muted)]">{helperText}</p>
      )}
    </div>
  )
}
