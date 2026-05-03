import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  DevServerRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import type { Project, Task } from '@taskhelm/core'
import { startDevServer, stopDevServer, getPoolStatus } from '@taskhelm/supervisor'

const tempFiles: string[] = []
const spawnedPids: number[] = []

function createTempDb(): { db: Database.Database; dbPath: string } {
  const dbPath = path.join(
    os.tmpdir(),
    `taskhelm-dev-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  )
  tempFiles.push(dbPath)
  const db = createDatabase(dbPath)
  runMigrations(db)
  return { db, dbPath }
}

afterEach(() => {
  for (const pid of spawnedPids.splice(0)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {}
  }
  for (const file of tempFiles.splice(0)) {
    for (const ext of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(file + ext)
      } catch {}
    }
  }
})

describe('dev start / stop flow (DB state)', () => {
  let db: Database.Database
  let project: Project
  let task: Task

  beforeEach(() => {
    const result = createTempDb()
    db = result.db

    const projectRepo = new ProjectRepository(db)
    project = projectRepo.create({
      name: 'Dev Test Project',
      slug: 'dev-test',
      local_repo_root: '/tmp/dev-test',
      dev_command: 'node -e "setTimeout(()=>{},60000)"',
      max_active_dev_servers: 2,
    })

    const taskRepo = new TaskRepository(db)
    task = taskRepo.create({ project_id: project.id, title: 'Dev Task' })
  })

  afterEach(() => {
    db.close()
  })

  it('startDevServer creates a running dev server in DB', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19300,
      healthcheckDelayMs: 0,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    const repo = new DevServerRepository(db)
    const found = repo.findById(devServer.id)

    expect(found).not.toBeNull()
    expect(found!.status).toBe('running')
    expect(found!.port).toBe(19300)
    expect(found!.task_id).toBe(task.id)
  })

  it('task can be updated with port and dev_server_state after start', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19301,
      healthcheckDelayMs: 0,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    const taskRepo = new TaskRepository(db)
    const updated = taskRepo.update(task.id, {
      port: devServer.port,
      dev_server_state: 'running',
    })

    expect(updated.port).toBe(19301)
    expect(updated.dev_server_state).toBe('running')
  })

  it('stopDevServer marks server as stopped and process is killed', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19302,
      healthcheckDelayMs: 0,
    })

    const pid = devServer.pid!

    stopDevServer(db, devServer.id)

    const repo = new DevServerRepository(db)
    const found = repo.findById(devServer.id)
    expect(found!.status).toBe('stopped')

    // Wait briefly for the process to terminate after SIGTERM
    await new Promise((resolve) => setTimeout(resolve, 200))

    let alive = true
    try {
      process.kill(pid, 0)
    } catch {
      alive = false
    }
    expect(alive).toBe(false)
  })

  it('task can be cleared of port/dev_server_state after stop', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19303,
      healthcheckDelayMs: 0,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    const taskRepo = new TaskRepository(db)
    taskRepo.update(task.id, { port: devServer.port, dev_server_state: 'running' })

    stopDevServer(db, devServer.id)

    const updated = taskRepo.update(task.id, {
      port: undefined,
      dev_server_state: 'stopped',
    })

    expect(updated.dev_server_state).toBe('stopped')
  })
})

describe('dev pool status', () => {
  let db: Database.Database
  let project: Project

  beforeEach(() => {
    const result = createTempDb()
    db = result.db

    const projectRepo = new ProjectRepository(db)
    project = projectRepo.create({
      name: 'Pool Project',
      slug: 'pool-project',
      local_repo_root: '/tmp/pool',
      max_active_dev_servers: 3,
    })
  })

  afterEach(() => {
    db.close()
  })

  it('returns empty pool when no servers are running', () => {
    const status = getPoolStatus(db, project.id)
    expect(status.active).toBe(0)
    expect(status.max).toBe(3)
    expect(status.servers).toHaveLength(0)
  })

  it('reflects the max from project config', () => {
    const { active, max } = getPoolStatus(db, project.id)
    expect(active).toBe(0)
    expect(max).toBe(3)
  })

  it('enforces max_active_dev_servers limit (max=1)', async () => {
    const projectRepo = new ProjectRepository(db)
    const strictProject = projectRepo.create({
      name: 'Strict Project',
      slug: 'strict-project',
      local_repo_root: '/tmp/strict',
      max_active_dev_servers: 1,
    })

    const taskRepo = new TaskRepository(db)
    const t1 = taskRepo.create({ project_id: strictProject.id, title: 'T1' })
    const t2 = taskRepo.create({ project_id: strictProject.id, title: 'T2' })

    const devServer = await startDevServer({
      db,
      projectId: strictProject.id,
      taskId: t1.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19310,
      healthcheckDelayMs: 0,
    })
    if (devServer.pid) spawnedPids.push(devServer.pid)

    await expect(
      startDevServer({
        db,
        projectId: strictProject.id,
        taskId: t2.id,
        devCommand: 'node -e "setTimeout(()=>{},60000)"',
        cwd: os.tmpdir(),
        port: 19311,
        healthcheckDelayMs: 0,
      })
    ).rejects.toThrow('Max active dev servers')
  })
})
