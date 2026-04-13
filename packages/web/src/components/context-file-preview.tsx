interface ContextFilePreviewProps {
  readonly filename: string | null
  readonly content: string | null
}

export function ContextFilePreview({ filename, content }: ContextFilePreviewProps) {
  if (!filename || !content) {
    return (
      <div
        className="context-file-preview flex flex-1 items-center justify-center rounded-[var(--glass-radius-sm)] border p-4"
        style={{ background: 'rgba(255,255,255,0.42)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm text-[var(--text-muted)]">Select a file to preview</p>
      </div>
    )
  }

  return (
    <div
      className="context-file-preview flex-1 overflow-auto rounded-[var(--glass-radius-sm)] border p-4"
      style={{ background: 'rgba(255,255,255,0.42)', borderColor: 'var(--border)' }}
    >
      <div className="mb-3 border-b pb-2 font-mono text-xs text-[var(--text-muted)]" style={{ borderColor: 'var(--border)' }}>
        {filename}
      </div>
      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--text-secondary)]">
        {content}
      </pre>
    </div>
  )
}
