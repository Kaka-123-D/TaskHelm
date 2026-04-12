import Link from 'next/link'

interface BreadcrumbSegment {
  readonly label: string
  readonly href?: string
}

interface BreadcrumbProps {
  readonly segments: readonly BreadcrumbSegment[]
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-[var(--text-muted)]">/</span>}
            {segment.href && !isLast ? (
              <Link
                href={segment.href}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}>
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
