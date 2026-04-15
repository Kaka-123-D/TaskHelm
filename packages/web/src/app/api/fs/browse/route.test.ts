import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

describe('GET /api/fs/browse', () => {
  let browseRoot: string

  beforeEach(() => {
    browseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-browse-'))
    fs.mkdirSync(path.join(browseRoot, 'guides'))
    fs.writeFileSync(path.join(browseRoot, 'context.md'), '# Context\n')
    fs.writeFileSync(path.join(browseRoot, 'notes.txt'), 'ignore me')
  })

  afterEach(() => {
    fs.rmSync(browseRoot, { recursive: true, force: true })
  })

  it('returns directories and supported context files for the requested path', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new Request(`http://localhost/api/fs/browse?path=${encodeURIComponent(browseRoot)}`),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      current: browseRoot,
      dirs: [{ name: 'guides' }],
      files: [
        { name: 'context.md', path: path.join(browseRoot, 'context.md'), category: 'markdown' },
        { name: 'notes.txt', path: path.join(browseRoot, 'notes.txt'), category: 'text' },
      ],
    })
  })
})
