import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverMarkdownFiles } from '@/lib/context-vault/markdown-vault'

describe('discoverMarkdownFiles', () => {
  it('reads local video assets as data URLs for preview', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-vault-video-'))
    const videoPath = path.join(root, 'media', 'demo.mp4')
    fs.mkdirSync(path.dirname(videoPath), { recursive: true })
    fs.writeFileSync(videoPath, Buffer.from([0, 1, 2, 3]))

    const result = discoverMarkdownFiles(root)
    const video = result.files.find(file => file.relativePath === 'media/demo.mp4')

    expect(video).toMatchObject({
      category: 'video',
      mediaType: 'video/mp4',
      content: 'data:video/mp4;base64,AAECAw==',
    })
  })
})
