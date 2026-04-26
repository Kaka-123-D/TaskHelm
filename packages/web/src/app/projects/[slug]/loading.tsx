function TaskRowSkeleton() {
  return (
    <div className="task-row-surface flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="skeleton-block" style={{ height: 14, width: '55%', marginBottom: 8 }} />
        <div className="skeleton-block" style={{ height: 12, width: '85%', marginBottom: 10 }} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton-block" style={{ height: 22, width: 64, borderRadius: 999 }} />
          <div className="skeleton-block" style={{ height: 22, width: 110, borderRadius: 999 }} />
          <div className="skeleton-block" style={{ height: 22, width: 90, borderRadius: 999 }} />
          <div className="skeleton-block" style={{ height: 22, width: 56, borderRadius: 999 }} />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="skeleton-block" style={{ height: 28, width: 64, borderRadius: 10 }} />
        <div className="skeleton-block" style={{ height: 28, width: 68, borderRadius: 10 }} />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="workbench-page-shell" aria-busy="true" aria-live="polite">
      <div className="skeleton-block" style={{ height: 16, width: 220 }} />
      <section className="workbench-hero">
        <div className="workbench-hero-header">
          <div style={{ flex: 1 }}>
            <div className="skeleton-block" style={{ height: 12, width: 140, marginBottom: 12 }} />
            <div className="skeleton-block" style={{ height: 28, width: '45%', marginBottom: 12 }} />
            <div className="skeleton-block" style={{ height: 14, width: '70%' }} />
          </div>
        </div>
        <div className="workbench-meta-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="workbench-meta-card">
              <div className="skeleton-block" style={{ height: 10, width: 80, marginBottom: 8 }} />
              <div className="skeleton-block" style={{ height: 18, width: '60%' }} />
            </div>
          ))}
        </div>
      </section>
      <section className="workbench-section-shell">
        <div className="workbench-section-header">
          <div>
            <div className="skeleton-block" style={{ height: 16, width: 120, marginBottom: 6 }} />
            <div className="skeleton-block" style={{ height: 12, width: 280 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <TaskRowSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
