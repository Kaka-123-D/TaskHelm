import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  DevServerRepository,
} from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_subrepo_dev__.db')
let db: ReturnType<typeof createDatabase>
let worktreeDir: string

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

function removeTestDb(): void {
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
}

beforeEach(() => {
  removeTestDb()
  worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-subrepo-dev-'))
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db?.close()
  fs.rmSync(worktreeDir, { recursive: true, force: true })
  removeTestDb()
})

function setupTaskWithSubrepo(devCommand: string | null = null) {
  const project = new ProjectRepository(db).create({
    name: 'multi-repo',
    slug: 'multi-repo',
    local_repo_root: worktreeDir,
    dev_command: devCommand ?? undefined,
    max_active_dev_servers: 5,
  })
  const task = new TaskRepository(db).create({
    project_id: project.id,
    title: 'multi-repo task',
  })
  const subrepo = new TaskSubrepoRepository(db).create({
    task_id: task.id,
    repo_path: 'repos/backend',
    worktree_path: worktreeDir,
  })
  return { project, task, subrepo }
}

describe('POST /api/tasks/[taskId]/subrepos/[subrepoId]/dev', () => {
  it('rejects when the task does not exist', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ taskId: 'missing', subrepoId: 'also-missing' }) },
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({ error: 'Task not found' })
  })

  it('rejects when the subrepo does not belong to the task', async () => {
    const { task } = setupTaskWithSubrepo()
    const otherTask = new TaskRepository(db).create({
      project_id: task.project_id,
      title: 'other',
    })
    const otherSub = new TaskSubrepoRepository(db).create({
      task_id: otherTask.id,
      repo_path: 'repos/other',
      worktree_path: worktreeDir,
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ taskId: task.id, subrepoId: otherSub.id }) },
    )

    expect(response.status).toBe(404)
  })

  it('rejects when subrepo has no worktree_path', async () => {
    const project = new ProjectRepository(db).create({
      name: 'multi-repo',
      slug: 'multi-repo',
      local_repo_root: worktreeDir,
      dev_command: 'node -e "setTimeout(()=>{},60000)"',
    })
    const task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'multi-repo task',
    })
    const subrepo = new TaskSubrepoRepository(db).create({
      task_id: task.id,
      repo_path: 'repos/backend',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ taskId: task.id, subrepoId: subrepo.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: /Initialize/ })
  })

  it('rejects when neither subrepo nor project has a dev command', async () => {
    const { task, subrepo } = setupTaskWithSubrepo(null)

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ taskId: task.id, subrepoId: subrepo.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: /dev_command/,
    })
  })

  it('rejects when an active server already exists for the subrepo', async () => {
    const { project, task, subrepo } = setupTaskWithSubrepo(
      'node -e "setTimeout(()=>{},60000)"',
    )
    new DevServerRepository(db).create({
      project_id: project.id,
      task_id: task.id,
      task_subrepo_id: subrepo.id,
      port: 30100,
      status: 'running',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', { method: 'POST', body: '{}' }),
      { params: Promise.resolve({ taskId: task.id, subrepoId: subrepo.id }) },
    )

    expect(response.status).toBe(409)
  })
})

describe('DELETE /api/tasks/[taskId]/subrepos/[subrepoId]/dev', () => {
  it('returns 404 when there is no active server', async () => {
    const { task, subrepo } = setupTaskWithSubrepo()
    const { DELETE } = await import('./route')
    const response = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ taskId: task.id, subrepoId: subrepo.id }),
    })

    expect(response.status).toBe(404)
  })
})
