interface StatusBadgeProps {
  readonly value: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' },
  ready: { bg: 'var(--status-ready-bg)', text: 'var(--status-ready)' },
  running: { bg: 'var(--status-running-bg)', text: 'var(--status-running)' },
  reviewing: { bg: 'var(--status-reviewing-bg)', text: 'var(--status-reviewing)' },
  blocked: { bg: 'var(--status-blocked-bg)', text: 'var(--status-blocked)' },
  done: { bg: 'var(--status-done-bg)', text: 'var(--status-done)' },
  archived: { bg: 'var(--status-archived-bg)', text: 'var(--status-archived)' },
  warm: { bg: 'var(--status-running-bg)', text: 'var(--status-running)' },
  sleeping: { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' },
  starting: { bg: 'var(--status-ready-bg)', text: 'var(--status-ready)' },
  failed: { bg: 'var(--status-blocked-bg)', text: 'var(--status-blocked)' },
  stopped: { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' },
}

const FALLBACK = { bg: 'var(--status-draft-bg)', text: 'var(--status-draft)' }

export function StatusBadge({ value }: StatusBadgeProps) {
  const style = STATUS_STYLES[value] ?? FALLBACK
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.74rem] font-semibold"
      style={{ background: style.bg, color: style.text, borderColor: 'rgba(46, 38, 27, 0.08)' }}
    >
      {value.replace(/_/g, ' ')}
    </span>
  )
}
