import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverMarkdownFiles } from '@/lib/context-vault/markdown-vault'

describe('discoverMarkdownFiles', () => {
  it('returns metadata only — never inlines file bytes', () => {
    // Regression for the V8 "Invalid string length" failure: discovering a
    // folder full of images used to base64 every binary into a single JSON
    // response and crash. Discovery must now leave `content` null and let
    // the client stream individual files via /api/files/serve.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-vault-meta-'))
    const videoPath = path.join(root, 'media', 'demo.mp4')
    const markdownPath = path.join(root, 'notes.md')
    fs.mkdirSync(path.dirname(videoPath), { recursive: true })
    fs.writeFileSync(videoPath, Buffer.from([0, 1, 2, 3]))
    fs.writeFileSync(markdownPath, '# hi')

    const result = discoverMarkdownFiles(root)
    const video = result.files.find(f => f.relativePath === 'media/demo.mp4')
    const md = result.files.find(f => f.relativePath === 'notes.md')

    expect(video).toMatchObject({
      category: 'video',
      mediaType: 'video/mp4',
      content: null,
      size: 4,
    })
    expect(md).toMatchObject({
      category: 'markdown',
      content: null,
      size: 4,
    })
    expect(video?.absolutePath).toBe(videoPath)
  })
})
