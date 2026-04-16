import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_tasks_route__.db')
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

describe('GET /api/tasks', () => {
  it('ignores legacy status filters and returns all tasks for the project', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })
    const taskRepo = new TaskRepository(db)
    taskRepo.create({ project_id: project.id, title: 'Task A' })
    taskRepo.create({ project_id: project.id, title: 'Task B' })

    const { GET } = await import('./route')
    const response = await GET(
      new Request(`http://localhost/api/tasks?projectId=${project.id}&status=ready`),
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as Array<{ title: string }>
    expect(payload).toHaveLength(2)
    expect(payload.map(task => task.title)).toEqual(['Task A', 'Task B'])
  })
})

describe('POST /api/tasks', () => {
  it('creates a task with refer_link and excludes legacy source fields', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          project_id: project.id,
          title: 'Ship auth',
          refer_link: 'https://example.com/tickets/42',
          priority: 3,
        }),
      }),
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as {
      title: string
      refer_link?: string
      source_type?: string
      source_ref?: string
    }
    expect(payload.title).toBe('Ship auth')
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

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          project_id: project.id,
          title: 'Ship auth',
          refer_link: 'not-a-url',
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Refer link must be a valid absolute URL',
    })
  })
})
