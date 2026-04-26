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
            <div key={index} className="skeleton-block" style={{ height: 64 }} />
          ))}
        </div>
      </section>
    </div>
  )
}
