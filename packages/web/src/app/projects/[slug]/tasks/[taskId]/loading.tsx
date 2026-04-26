function PanelSkeleton({ height }: { height: number }) {
  return (
    <div
      className="task-row-surface"
      style={{ minHeight: height, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div className="skeleton-block" style={{ height: 14, width: 120 }} />
      <div className="skeleton-block" style={{ height: 10, width: '85%' }} />
      <div className="skeleton-block" style={{ height: 10, width: '70%' }} />
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <div className="skeleton-block" style={{ height: 28, width: 80, borderRadius: 10 }} />
        <div className="skeleton-block" style={{ height: 28, width: 72, borderRadius: 10 }} />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="workbench-page-shell" aria-busy="true" aria-live="polite">
      <div className="skeleton-block" style={{ height: 16, width: 280 }} />
      <section className="workbench-hero">
        <div className="workbench-hero-header">
          <div style={{ flex: 1 }}>
            <div className="skeleton-block" style={{ height: 12, width: 140, marginBottom: 12 }} />
            <div className="skeleton-block" style={{ height: 28, width: '55%', marginBottom: 12 }} />
            <div className="skeleton-block" style={{ height: 14, width: '80%' }} />
          </div>
        </div>
        <div className="workbench-meta-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="workbench-meta-card">
              <div className="skeleton-block" style={{ height: 10, width: 70, marginBottom: 8 }} />
              <div className="skeleton-block" style={{ height: 18, width: '50%' }} />
            </div>
          ))}
        </div>
      </section>
      <div
        className="task-detail-section"
        style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)' }}
      >
        <PanelSkeleton height={320} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PanelSkeleton height={160} />
          <PanelSkeleton height={180} />
        </div>
      </div>
    </div>
  )
}
