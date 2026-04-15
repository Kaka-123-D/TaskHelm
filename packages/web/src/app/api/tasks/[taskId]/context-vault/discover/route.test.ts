import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_context_vault_discover__.db')
let db: ReturnType<typeof createDatabase>
let vaultRoot: string

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)

  vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-vault-'))
  fs.mkdirSync(path.join(vaultRoot, 'guides'), { recursive: true })
  fs.mkdirSync(path.join(vaultRoot, 'plans'), { recursive: true })
  fs.writeFileSync(path.join(vaultRoot, 'guides', 'context.md'), '# Context\n')
  fs.writeFileSync(path.join(vaultRoot, 'plans', 'plan.md'), '# Plan\n')
  fs.writeFileSync(path.join(vaultRoot, 'notes.txt'), 'keep me')
  fs.writeFileSync(path.join(vaultRoot, 'config.json'), '{"ok":true}')
  fs.writeFileSync(path.join(vaultRoot, 'diagram.png'), Buffer.from('png', 'utf8'))
})

afterEach(() => {
  db.close()
  fs.rmSync(vaultRoot, { recursive: true, force: true })
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('POST /api/tasks/[taskId]/context-vault/discover', () => {
  it('discovers supported text and image files recursively from a folder', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'Ship auth',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/tasks/task-1/context-vault/discover', {
        method: 'POST',
        body: JSON.stringify({ path: vaultRoot }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      rootPath: vaultRoot,
      files: [
        { relativePath: 'config.json', category: 'text' },
        { relativePath: 'diagram.png', category: 'image' },
        { relativePath: 'guides/context.md' },
        { relativePath: 'notes.txt', category: 'text' },
        { relativePath: 'plans/plan.md' },
      ],
    })
  })
})
