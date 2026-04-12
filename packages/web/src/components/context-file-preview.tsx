interface ContextFilePreviewProps {
  readonly filename: string | null
  readonly content: string | null
}

export function ContextFilePreview({ filename, content }: ContextFilePreviewProps) {
  if (!filename || !content) {
    return (
      <div
        className="flex-1 rounded-[var(--glass-radius-sm)] border p-4 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm text-[var(--text-muted)]">Select a file to preview</p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 rounded-[var(--glass-radius-sm)] border p-4 overflow-auto"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}
    >
      <div className="text-xs font-mono text-[var(--text-muted)] mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {filename}
      </div>
      <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  )
}
