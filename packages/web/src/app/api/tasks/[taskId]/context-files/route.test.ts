import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, ProjectRepository, runMigrations, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_context_files_route__.db')
let db: ReturnType<typeof createDatabase>

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('GET /api/tasks/[taskId]/context-files', () => {
  it('prefers persisted context vault files over the legacy capsule files', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })

    taskRepo.update(task.id, {
      context_vault_root_path: '/tmp/vault-root',
      context_vault_files_json: JSON.stringify([
        {
          relativePath: 'guides/context.md',
          absolutePath: '/tmp/vault-root/guides/context.md',
          content: '# Context\n',
        },
      ]),
      context_vault_selected_file: 'guides/context.md',
    })

    const { GET } = await import('./route')
    const response = await GET(
      new Request('http://localhost/api/tasks/task-1/context-files'),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      capsuleDir: '/tmp/vault-root',
      files: [
        {
          name: 'guides/context.md',
          path: '/tmp/vault-root/guides/context.md',
          exists: true,
          content: '# Context\n',
        },
      ],
    })
  })
})
