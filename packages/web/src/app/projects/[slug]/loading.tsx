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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-block" style={{ height: 72 }} />
          ))}
        </div>
      </section>
    </div>
  )
}
