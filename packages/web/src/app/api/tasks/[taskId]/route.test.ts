import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_task_route__.db')
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

describe('PATCH /api/tasks/[taskId]', () => {
  it('ignores legacy status payloads and updates other writable fields', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Original',
      priority: 3,
    })

    const { PATCH } = await import('./route')
    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated',
          priority: 2,
          status: 'done',
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as { title: string; priority: number; status?: string }
    expect(payload.title).toBe('Updated')
    expect(payload.priority).toBe(2)
    expect(payload).not.toHaveProperty('status')
  })

  it('updates refer_link and excludes legacy source fields', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Original',
      priority: 3,
    })

    const { PATCH } = await import('./route')
    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          refer_link: 'https://example.com/tickets/42',
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      refer_link?: string
      source_type?: string
      source_ref?: string
    }
    expect(payload.refer_link).toBe('https://example.com/tickets/42')
    expect(payload).not.toHaveProperty('source_type')
    expect(payload).not.toHaveProperty('source_ref')
  })

  it('rejects an invalid refer_link', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Original',
      priority: 3,
    })

    const { PATCH } = await import('./route')
    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          refer_link: 'not-a-url',
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Refer link must be a valid absolute URL',
    })
  })
})
