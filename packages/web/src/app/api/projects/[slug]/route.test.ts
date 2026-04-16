import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase, runMigrations, DevServerRepository, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_project_route__.db')
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

describe('DELETE /api/projects/[slug]', () => {
  it('deletes a project and its dependent task/runtime records', async () => {
    const projectRepo = new ProjectRepository(db)
    const taskRepo = new TaskRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const project = projectRepo.create({
      name: 'Delete Me',
      slug: 'delete-me',
      local_repo_root: '/repo/delete-me',
    })

    const task = taskRepo.create({
      project_id: project.id,
      title: 'Child task',
    })

    devServerRepo.create({
      project_id: project.id,
      task_id: task.id,
      port: 4309,
      status: 'running',
    })

    db.prepare(
      `INSERT INTO agent_runs (id, task_id, kind, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('agent-1', task.id, 'dispatch', 'worker', 'running', new Date().toISOString())

    db.prepare(
      `INSERT INTO review_gates (id, task_id, gate_type, status)
       VALUES (?, ?, ?, ?)`,
    ).run('gate-1', task.id, 'qa', 'open')

    db.prepare(
      `INSERT INTO notifications (id, task_id, project_id, level, channel, title, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('notif-1', task.id, project.id, 'info', 'in_app', 'Hello', 'pending', new Date().toISOString())

    db.prepare(
      `INSERT INTO events (id, entity_type, entity_id, event_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('event-1', 'project', project.id, 'created', new Date().toISOString())

    const { DELETE } = await import('./route')
    const response = await DELETE(new Request('http://localhost/api/projects/delete-me'), {
      params: Promise.resolve({ slug: 'delete-me' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ deleted: true })

    expect(projectRepo.findById(project.id)).toBeNull()
    expect(taskRepo.findById(task.id)).toBeNull()
    expect(devServerRepo.findByProjectId(project.id)).toHaveLength(0)

    expect(db.prepare('SELECT COUNT(*) AS count FROM agent_runs WHERE task_id = ?').get(task.id)).toEqual({ count: 0 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM review_gates WHERE task_id = ?').get(task.id)).toEqual({ count: 0 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE project_id = ? OR task_id = ?').get(project.id, task.id)).toEqual({ count: 0 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM events WHERE entity_type = ? AND entity_id = ?').get('project', project.id)).toEqual({ count: 0 })
  })
})

describe('PATCH /api/projects/[slug]', () => {
  it('updates a project without returning test_command', async () => {
    const projectRepo = new ProjectRepository(db)
    const project = projectRepo.create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const { PATCH } = await import('./route')
    const response = await PATCH(
      new Request('http://localhost/api/projects/alpha', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Alpha Updated',
          install_command: 'pnpm install',
        }),
      }),
      { params: Promise.resolve({ slug: 'alpha' }) },
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      name: string
      install_command?: string
      test_command?: string
    }
    expect(payload.name).toBe('Alpha Updated')
    expect(payload.install_command).toBe('pnpm install')
    expect(payload).not.toHaveProperty('test_command')
  })
})
