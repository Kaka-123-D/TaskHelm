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
const isPortAvailable = vi.fn<(port: number) => Promise<boolean>>(async (_port: number) => true)
const inspectListeningPort = vi.fn<
  (port: number) => Promise<{
    port: number
    pid: number | null
    command: string | null
    user: string | null
    cwd: string | null
  } | null>
>(async (_port: number) => null)
const killExternalProcessForPort = vi.fn<
  (port: number, pid: number) => Promise<{ stopped: boolean }>
>(async (_port: number, _pid: number) => ({
  stopped: true,
}))

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

vi.mock('@taskhelm/supervisor', () => ({
  startDevServer: (options: unknown) => startDevServer(options),
  stopDevServer: (db: unknown, serverId: unknown) => stopDevServer(db, serverId),
}))

vi.mock('@taskhelm/core', async importActual => {
  const actual = await importActual<typeof import('@taskhelm/core')>()
  return {
    ...actual,
    isPortAvailable: (port: number) => isPortAvailable(port),
  }
})

vi.mock('@/lib/dev/external-port', () => ({
  inspectListeningPort: (port: number) => inspectListeningPort(port),
  killExternalProcessForPort: (port: number, pid: number) => killExternalProcessForPort(port, pid),
}))

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
  startDevServer.mockReset()
  startDevServer.mockImplementation((_options: unknown) => ({
    id: 'dev-server-1',
    pid: 1234,
    port: 4555,
  }))
  stopDevServer.mockReset()
  stopDevServer.mockImplementation((_db: unknown, _serverId: unknown) => undefined)
  isPortAvailable.mockReset()
  isPortAvailable.mockResolvedValue(true)
  inspectListeningPort.mockReset()
  inspectListeningPort.mockResolvedValue(null)
  killExternalProcessForPort.mockReset()
  killExternalProcessForPort.mockResolvedValue({
    stopped: true,
  })
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

  it('returns structured external process details when the preferred port is occupied outside TaskHelm', async () => {
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

    isPortAvailable.mockResolvedValueOnce(false)
    inspectListeningPort.mockResolvedValueOnce({
      port: 4555,
      pid: 9912,
      command: 'node vite dev',
      user: 'vantienkhai',
      cwd: '/tmp/external-app',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ preferredPort: 4555 }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      conflictType: 'external_port_in_use',
      port: 4555,
      process: {
        pid: 9912,
        command: 'node vite dev',
        user: 'vantienkhai',
        cwd: '/tmp/external-app',
      },
    })
    expect(startDevServer).not.toHaveBeenCalled()
  })

  it('reclaims a stale stopped dev server row before starting on the preferred port', async () => {
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
      `INSERT INTO dev_servers (id, project_id, task_id, port, status, started_at, stopped_at)
       VALUES ('stale-stopped', ?, 'other-task', 4555, 'stopped', ?, ?)`
    ).run(project.id, new Date().toISOString(), new Date().toISOString())

    startDevServer.mockReturnValueOnce({
      id: 'dev-server-2',
      pid: 2234,
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
    expect(
      db.prepare('SELECT COUNT(*) as count FROM dev_servers WHERE id = ?').get('stale-stopped'),
    ).toMatchObject({ count: 0 })
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

  it('kills an external process by pid when requested explicitly', async () => {
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

    inspectListeningPort.mockResolvedValueOnce({
      port: 4555,
      pid: 9912,
      command: 'node vite dev',
      user: 'vantienkhai',
      cwd: '/tmp/external-app',
    })

    const { DELETE } = await import('./route')
    const response = await DELETE(
      new Request('http://localhost', {
        method: 'DELETE',
        body: JSON.stringify({ externalPid: 9912, externalPort: 4555 }),
      }),
      {
        params: Promise.resolve({ taskId: task.id }),
      },
    )

    expect(response.status).toBe(200)
    expect(killExternalProcessForPort).toHaveBeenCalledWith(4555, 9912)
    await expect(response.json()).resolves.toMatchObject({
      stopped: true,
      external: true,
    })
  })

  it('frees a stopped preferred port so the same task can start again on that port', async () => {
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

    const route = await import('./route')

    const stopResponse = await route.DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ taskId: task.id }),
    })

    expect(stopResponse.status).toBe(200)

    startDevServer.mockReturnValueOnce({
      id: 'dev-server-2',
      pid: 2234,
      port: 4555,
    })

    const restartResponse = await route.POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ preferredPort: 4555 }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(restartResponse.status).toBe(201)
    expect(taskRepo.findById(task.id)).toMatchObject({
      preferred_port: 4555,
      port: 4555,
      dev_server_state: 'running',
    })
  })
})
