'use client'

import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { classifyContextVaultFile } from '@/lib/context-vault/file-preview'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

interface ContextFilePreviewProps {
  readonly file: PersistedContextVaultFile | null
}

function MermaidBlock({ chart }: { readonly chart: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mermaidId = useId().replace(/:/g, '-')

  useEffect(() => {
    let cancelled = false

    async function renderChart() {
      try {
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
        })

        const { svg: renderedSvg } = await mermaid.render(`taskhelm-${mermaidId}`, chart)
        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
        }
      } catch (renderError) {
        if (!cancelled) {
          setSvg(null)
          setError((renderError as Error).message)
        }
      }
    }

    void renderChart()

    return () => {
      cancelled = true
    }
  }, [chart, mermaidId])

  return (
    <div className="context-preview-mermaid" data-slot="mermaid-block">
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className="context-preview-code">{error ? `${error}\n\n${chart}` : chart}</pre>
      )}
    </div>
  )
}

function MarkdownPreview({
  content,
}: {
  readonly content: string
}) {
  return (
    <div className="context-preview-markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ul: ({ children }) => (
            <ul className="context-preview-list context-preview-list--unordered">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="context-preview-list context-preview-list--ordered">{children}</ol>
          ),
          li: ({ children }) => <li className="context-preview-list-item">{children}</li>,
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="context-preview-link"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => <div className="context-preview-pre">{children}</div>,
          table: ({ children }) => (
            <div className="context-preview-table-wrap">
              <table>{children}</table>
            </div>
          ),
          blockquote: ({ children }) => (
            <blockquote className="context-preview-blockquote">{children}</blockquote>
          ),
          hr: () => <hr className="context-preview-rule" />,
          code: ({ className, children, ...props }) => {
            const language = /language-(\S+)/.exec(className ?? '')?.[1]?.toLowerCase()
            const source = String(children ?? '').replace(/\n$/, '')

            if (language === 'mermaid') {
              return <MermaidBlock chart={source} />
            }

            return (
              <code {...props} className={className}>
                {children}
              </code>
            )
          },
          img: ({ src, alt, ...props }) => {
            return (
              <img
                {...props}
                src={typeof src === 'string' ? src : ''}
                alt={typeof alt === 'string' ? alt : ''}
                className="context-preview-markdown-image"
              />
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function ContextFilePreview({ file }: ContextFilePreviewProps) {
  const preview = file ? classifyContextVaultFile(file.relativePath) : null
  const resolvedCategory = file?.category ?? preview?.category ?? 'unsupported'
  const content = file?.content ?? null

  return (
    <div
      className="context-file-preview-shell rounded-[var(--glass-radius-sm)] border"
      style={{ background: 'rgba(255,255,255,0.42)', borderColor: 'var(--border)' }}
    >
      <div className="context-file-preview-toolbar border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="font-mono text-xs text-[var(--text-muted)] ml-[3rem]">
          {file?.relativePath ?? 'Preview'}
        </div>
        {file ? (
          <span className="context-vault-bind-badge">
            {resolvedCategory === 'markdown' ? 'md' : resolvedCategory}
          </span>
        ) : null}
      </div>

      <div className="context-file-preview-viewport">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={file?.relativePath ?? 'empty'}
            className="context-file-preview-stage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {!file || !content ? (
              <div className="context-vault-empty flex h-full items-center justify-center">
                <p className="text-sm text-[var(--text-muted)]">Select a context file to preview</p>
              </div>
            ) : resolvedCategory === 'markdown' ? (
              <div className="context-preview-markdown">
                <MarkdownPreview content={content} />
              </div>
            ) : resolvedCategory === 'image' ? (
              <div className="context-preview-image-frame">
                <img
                  src={content}
                  alt={file.relativePath}
                  className="context-preview-image"
                />
              </div>
            ) : resolvedCategory === 'video' ? (
              <div className="context-preview-video-frame">
                <video src={content} className="context-preview-video" controls playsInline />
              </div>
            ) : resolvedCategory === 'text' ? (
              <pre className="context-preview-code">{content}</pre>
            ) : (
              <div className="context-vault-empty flex h-full items-center justify-center">
                <p className="text-sm text-[var(--text-muted)]">Preview unavailable for this file type</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
