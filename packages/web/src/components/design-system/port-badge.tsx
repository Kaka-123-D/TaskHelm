interface PortBadgeProps {
  readonly port: number
}

export function PortBadge({ port }: PortBadgeProps) {
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded"
      style={{
        background: 'var(--primary-muted)',
        color: 'var(--primary)',
      }}
    >
      :{port}
    </span>
  )
}
