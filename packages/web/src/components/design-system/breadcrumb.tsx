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
    <nav className="workbench-breadcrumb">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="workbench-breadcrumb-segment">
            {i > 0 && <span className="workbench-breadcrumb-divider">/</span>}
            {segment.href && !isLast ? (
              <Link
                href={segment.href}
                className="workbench-breadcrumb-link"
              >
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'workbench-breadcrumb-current' : 'workbench-breadcrumb-link'}>
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
