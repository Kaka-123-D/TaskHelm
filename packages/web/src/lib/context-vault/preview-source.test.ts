import { describe, expect, it } from 'vitest'
import type { PersistedContextVaultFile } from './persisted-vault'
import { resolvePreviewSrc } from './preview-source'

const baseFile: PersistedContextVaultFile = {
  relativePath: 'media/demo.png',
  absolutePath: '/Users/me/proj/media/demo.png',
  content: null,
  category: 'image',
  mediaType: 'image/png',
}

describe('resolvePreviewSrc', () => {
  it('returns legacy content verbatim when present', () => {
    const result = resolvePreviewSrc(
      { ...baseFile, content: 'data:image/png;base64,iVBOR...' },
      { taskId: 'task-1' },
    )
    expect(result).toBe('data:image/png;base64,iVBOR...')
  })

  it('returns a blob URL when one is registered for the file path', () => {
    const blobUrls = new Map([['media/demo.png', 'blob:http://localhost/abc123']])
    const result = resolvePreviewSrc(baseFile, { taskId: 'task-1', blobUrls })
    expect(result).toBe('blob:http://localhost/abc123')
  })

  it('falls back to the serve route with taskId and path query params', () => {
    const result = resolvePreviewSrc(baseFile, { taskId: 'task-1' })
    expect(result).toBe(
      '/api/files/serve?taskId=task-1&path=%2FUsers%2Fme%2Fproj%2Fmedia%2Fdemo.png',
    )
  })

  it('prefers legacy content over blob URL when both are present', () => {
    // Pre-existing data-URL rows should keep working even if a brand-new
    // native picker session also exposes a blob URL.
    const blobUrls = new Map([['media/demo.png', 'blob:fresh']])
    const result = resolvePreviewSrc(
      { ...baseFile, content: 'data:legacy' },
      { taskId: 'task-1', blobUrls },
    )
    expect(result).toBe('data:legacy')
  })

  it('returns null when the file lacks both content and absolutePath', () => {
    const result = resolvePreviewSrc(
      { ...baseFile, absolutePath: '' },
      { taskId: 'task-1' },
    )
    expect(result).toBeNull()
  })
})
