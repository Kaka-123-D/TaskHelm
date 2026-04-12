const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--status-draft)',
  ready: 'var(--status-ready)',
  running: 'var(--status-running)',
  reviewing: 'var(--status-reviewing)',
  blocked: 'var(--status-blocked)',
  done: 'var(--status-done)',
  archived: 'var(--status-archived)',
  warm: 'var(--status-running)',
  sleeping: 'var(--status-draft)',
  starting: 'var(--status-ready)',
  failed: 'var(--status-blocked)',
  stopped: 'var(--status-draft)',
}

const GLOW_STATUSES = new Set(['running', 'warm', 'starting'])

interface StatusDotProps {
  readonly status: string
}

export function StatusDot({ status }: StatusDotProps) {
  const color = STATUS_COLORS[status] ?? 'var(--status-draft)'
  const hasGlow = GLOW_STATUSES.has(status)
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{
        background: color,
        boxShadow: hasGlow ? `0 0 8px ${color}` : undefined,
      }}
    />
  )
}
