import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_projects_route__.db')
let db: ReturnType<typeof createDatabase>

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db?.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('POST /api/projects', () => {
  it('creates a project without returning test_command', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Alpha',
          slug: 'alpha',
          local_repo_root: '/repo/alpha',
          dev_command: 'pnpm dev',
          install_command: 'pnpm install',
        }),
      }),
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as {
      name: string
      install_command?: string
      test_command?: string
    }
    expect(payload.name).toBe('Alpha')
    expect(payload.install_command).toBe('pnpm install')
    expect(payload).not.toHaveProperty('test_command')
  })
})
