import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_dev_route__.db')
let db: ReturnType<typeof createDatabase>

const startDevServer = vi.fn((_options: unknown) => ({
  id: 'dev-server-1',
  pid: 1234,
  port: 4555,
}))

const stopDevServer = vi.fn((_db: unknown, _serverId: unknown) => undefined)

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

vi.mock('@taskhelm/supervisor', () => ({
  startDevServer: (options: unknown) => startDevServer(options),
  stopDevServer: (db: unknown, serverId: unknown) => stopDevServer(db, serverId),
}))

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
  startDevServer.mockClear()
  stopDevServer.mockClear()
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('POST /api/tasks/[taskId]/dev', () => {
  it('persists preferred port and uses it when provided', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
      dev_command: 'pnpm dev',
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })
    taskRepo.update(task.id, { worktree_path: '/repo/alpha/.worktrees/alpha-ui' })

    startDevServer.mockReturnValueOnce({
      id: 'dev-server-1',
      pid: 1234,
      port: 4555,
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ preferredPort: 4555 }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(201)
    expect(startDevServer).toHaveBeenCalledWith(
      expect.objectContaining({ port: 4555 }),
    )
    expect(taskRepo.findById(task.id)).toMatchObject({
      preferred_port: 4555,
      port: 4555,
      dev_server_state: 'running',
    })
  })

  it('returns a clear error when the requested preferred port is already reserved', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
      dev_command: 'pnpm dev',
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })
    taskRepo.update(task.id, { worktree_path: '/repo/alpha/.worktrees/alpha-ui' })

    db.prepare(
      `INSERT INTO dev_servers (id, project_id, task_id, port, status, started_at)
       VALUES ('dev-in-use', ?, 'other-task', 4567, 'running', ?)`
    ).run(project.id, new Date().toISOString())

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ preferredPort: 4567 }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Preferred port 4567 is not available',
    })
  })
})

describe('DELETE /api/tasks/[taskId]/dev', () => {
  it('stops the server but keeps preferred_port saved on the task', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
      dev_command: 'pnpm dev',
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })

    taskRepo.update(task.id, {
      worktree_path: '/repo/alpha/.worktrees/alpha-ui',
      preferred_port: 4555,
      port: 4555,
      dev_server_state: 'running',
    })

    db.prepare(
      `INSERT INTO dev_servers (id, project_id, task_id, port, status, started_at)
       VALUES ('dev-1', ?, ?, 4555, 'running', ?)`
    ).run(project.id, task.id, new Date().toISOString())

    const { DELETE } = await import('./route')
    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ taskId: task.id }),
    })

    expect(response.status).toBe(200)
    expect(stopDevServer).toHaveBeenCalledWith(db, 'dev-1')
    expect(taskRepo.findById(task.id)).toMatchObject({
      preferred_port: 4555,
      dev_server_state: 'stopped',
    })
  })
})
