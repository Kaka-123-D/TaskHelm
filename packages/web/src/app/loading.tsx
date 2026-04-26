function ProjectCardSkeleton() {
  return (
    <div
      className="task-row-surface flex items-center gap-3"
      style={{ minHeight: 88 }}
    >
      <div className="min-w-0 flex-1">
        <div className="skeleton-block" style={{ height: 16, width: '40%', marginBottom: 10 }} />
        <div className="skeleton-block" style={{ height: 12, width: '78%', marginBottom: 10 }} />
        <div className="flex items-center gap-2">
          <div className="skeleton-block" style={{ height: 20, width: 90, borderRadius: 999 }} />
          <div className="skeleton-block" style={{ height: 20, width: 110, borderRadius: 999 }} />
        </div>
      </div>
      <div className="skeleton-block" style={{ height: 28, width: 90, borderRadius: 10 }} />
    </div>
  )
}

export default function Loading() {
  return (
    <div className="workbench-page-shell" aria-busy="true" aria-live="polite">
      <div className="skeleton-block" style={{ height: 16, width: 160 }} />
      <section className="workbench-hero">
        <div className="workbench-hero-header">
          <div style={{ flex: 1 }}>
            <div className="skeleton-block" style={{ height: 12, width: 120, marginBottom: 12 }} />
            <div className="skeleton-block" style={{ height: 28, width: '40%', marginBottom: 12 }} />
            <div className="skeleton-block" style={{ height: 14, width: '70%' }} />
          </div>
        </div>
      </section>
      <section className="workbench-section-shell">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
