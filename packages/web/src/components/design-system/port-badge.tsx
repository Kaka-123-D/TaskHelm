interface PortBadgeProps {
  readonly port: number
}

export function PortBadge({ port }: PortBadgeProps) {
  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-[0.74rem] font-semibold"
      style={{
        background: 'var(--accent-muted)',
        color: 'var(--accent-ink)',
        borderColor: 'rgba(47, 109, 246, 0.12)',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      }}
    >
      :{port}
    </span>
  )
}
