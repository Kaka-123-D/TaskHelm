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
      <div className="task-detail-section">
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)' }}>
          <div className="skeleton-block" style={{ height: 360 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton-block" style={{ height: 160 }} />
            <div className="skeleton-block" style={{ height: 180 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
