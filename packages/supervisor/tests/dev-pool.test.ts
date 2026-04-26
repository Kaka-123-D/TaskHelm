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
import { startDevServer, stopDevServer, getPoolStatus, buildChildEnv } from '../src/dev-pool.js'

const TEST_DB = path.join(import.meta.dirname, '__test_dev_pool__.db')
let db: Database.Database
let project: Project
let task: Task

// Track spawned PIDs for cleanup
const spawnedPids: number[] = []

async function waitForFile(filePath: string, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (fs.existsSync(filePath)) return
    await new Promise(resolve => setTimeout(resolve, 25))
  }

  throw new Error(`Timed out waiting for file: ${filePath}`)
}

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)

  const projectRepo = new ProjectRepository(db)
  project = projectRepo.create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: '/tmp/test-repo',
    max_active_dev_servers: 2,
  })

  const taskRepo = new TaskRepository(db)
  task = taskRepo.create({
    project_id: project.id,
    title: 'Test Task',
    worktree_path: os.tmpdir(),
  } as Parameters<typeof taskRepo.create>[0])
})

afterEach(() => {
  // Kill any spawned processes
  for (const pid of spawnedPids.splice(0)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {}
  }

  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('startDevServer', () => {
  it('creates a dev server record with status=running and valid PID', () => {
    const devServer = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19200,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    expect(devServer.id).toBeTruthy()
    expect(devServer.project_id).toBe(project.id)
    expect(devServer.task_id).toBe(task.id)
    expect(devServer.port).toBe(19200)
    expect(devServer.status).toBe('running')
    expect(devServer.pid).toBeGreaterThan(0)
  })

  it('persists the dev server in DB', () => {
    const devServer = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19201,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    const repo = new DevServerRepository(db)
    const found = repo.findById(devServer.id)

    expect(found).not.toBeNull()
    expect(found!.status).toBe('running')
    expect(found!.pid).toBe(devServer.pid)
  })

  it('does not leak TaskHelm production NODE_ENV into child dev servers', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-dev-env-'))
    const scriptPath = path.join(tempDir, 'capture-env.js')
    const outputPath = path.join(tempDir, 'node-env.txt')
    const originalNodeEnv = process.env.NODE_ENV

    fs.writeFileSync(
      scriptPath,
      [
        "const { writeFileSync } = require('node:fs')",
        `writeFileSync(${JSON.stringify(outputPath)}, process.env.NODE_ENV ?? '')`,
        'setTimeout(() => {}, 60000)',
      ].join('\n')
    )

    process.env.NODE_ENV = 'production'

    try {
      const devServer = startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: `node ${scriptPath}`,
        cwd: tempDir,
        port: 19203,
      })

      if (devServer.pid) spawnedPids.push(devServer.pid)

      await waitForFile(outputPath)
      expect(fs.readFileSync(outputPath, 'utf-8')).toBe('development')
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = originalNodeEnv
      }
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('strips Next.js standalone runtime env vars before spawning child dev servers', () => {
    const parentEnv: NodeJS.ProcessEnv = {
      PATH: '/usr/bin',
      NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1',
      KEEP_ALIVE_TIMEOUT: '60000',
      __NEXT_PRIVATE_STANDALONE_CONFIG: '{"foo":1}',
      __NEXT_PRIVATE_PREBUNDLED_REACT: '1',
      NEXT_RUNTIME: 'nodejs',
      USER_DEFINED: 'keep-me',
    }

    const childEnv = buildChildEnv(parentEnv, 4242)

    expect(childEnv.HOSTNAME).toBeUndefined()
    expect(childEnv.KEEP_ALIVE_TIMEOUT).toBeUndefined()
    expect(childEnv.__NEXT_PRIVATE_STANDALONE_CONFIG).toBeUndefined()
    expect(childEnv.__NEXT_PRIVATE_PREBUNDLED_REACT).toBeUndefined()
    expect(childEnv.NEXT_RUNTIME).toBeUndefined()
    expect(childEnv.USER_DEFINED).toBe('keep-me')
    expect(childEnv.PATH).toBe('/usr/bin')
    expect(childEnv.NODE_ENV).toBe('development')
    expect(childEnv.PORT).toBe('4242')
  })

  it('does not leak __NEXT_PRIVATE_STANDALONE_CONFIG into spawned child dev servers', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-dev-next-'))
    const scriptPath = path.join(tempDir, 'capture-next-config.js')
    const outputPath = path.join(tempDir, 'next-config.txt')
    const originalConfig = process.env.__NEXT_PRIVATE_STANDALONE_CONFIG
    const originalHostname = process.env.HOSTNAME

    fs.writeFileSync(
      scriptPath,
      [
        "const { writeFileSync } = require('node:fs')",
        `writeFileSync(${JSON.stringify(outputPath)}, JSON.stringify({ config: process.env.__NEXT_PRIVATE_STANDALONE_CONFIG ?? null, hostname: process.env.HOSTNAME ?? null }))`,
        'setTimeout(() => {}, 60000)',
      ].join('\n')
    )

    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = '{"experimental":{"turbopack":{"root":"/tmp/gone"}}}'
    process.env.HOSTNAME = '127.0.0.1'

    try {
      const devServer = startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: `node ${scriptPath}`,
        cwd: tempDir,
        port: 19204,
      })

      if (devServer.pid) spawnedPids.push(devServer.pid)

      await waitForFile(outputPath)
      const captured = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as {
        config: string | null
        hostname: string | null
      }
      expect(captured.config).toBeNull()
      expect(captured.hostname).toBeNull()
    } finally {
      if (originalConfig === undefined) {
        delete process.env.__NEXT_PRIVATE_STANDALONE_CONFIG
      } else {
        process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = originalConfig
      }
      if (originalHostname === undefined) {
        delete process.env.HOSTNAME
      } else {
        process.env.HOSTNAME = originalHostname
      }
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('throws when project not found', () => {
    expect(() =>
      startDevServer({
        db,
        projectId: 'nonexistent-project',
        taskId: task.id,
        devCommand: 'node -e ""',
        cwd: os.tmpdir(),
        port: 19202,
      })
    ).toThrow('Project not found')
  })

  it('throws when max_active_dev_servers is exceeded', () => {
    // max is 2, fill it up
    const devServer1 = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19210,
    })
    if (devServer1.pid) spawnedPids.push(devServer1.pid)

    const taskRepo = new TaskRepository(db)
    const task2 = taskRepo.create({ project_id: project.id, title: 'Task 2' })

    const devServer2 = startDevServer({
      db,
      projectId: project.id,
      taskId: task2.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19211,
    })
    if (devServer2.pid) spawnedPids.push(devServer2.pid)

    const task3 = taskRepo.create({ project_id: project.id, title: 'Task 3' })

    expect(() =>
      startDevServer({
        db,
        projectId: project.id,
        taskId: task3.id,
        devCommand: 'node -e "setTimeout(()=>{},60000)"',
        cwd: os.tmpdir(),
        port: 19212,
      })
    ).toThrow('Max active dev servers')
  })
})

describe('stopDevServer', () => {
  it('sets status to stopped in DB and sends kill signal', async () => {
    const devServer = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19220,
    })

    const pid = devServer.pid!

    stopDevServer(db, devServer.id)

    const repo = new DevServerRepository(db)
    const found = repo.findById(devServer.id)
    expect(found!.status).toBe('stopped')
    expect(found!.stopped_at).not.toBeNull()

    // Wait briefly for the process to terminate after SIGTERM
    await new Promise((resolve) => setTimeout(resolve, 200))

    let processAlive = true
    try {
      process.kill(pid, 0)
    } catch {
      processAlive = false
    }
    expect(processAlive).toBe(false)
  })

  it('throws when server not found', () => {
    expect(() => stopDevServer(db, 'nonexistent')).toThrow('DevServer not found')
  })
})

describe('getPoolStatus', () => {
  it('returns active count, max, and servers list', () => {
    const status = getPoolStatus(db, project.id)

    expect(status.active).toBe(0)
    expect(status.max).toBe(2)
    expect(status.servers).toHaveLength(0)
  })

  it('reflects started servers in pool status', () => {
    const devServer = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19230,
    })
    if (devServer.pid) spawnedPids.push(devServer.pid)

    const status = getPoolStatus(db, project.id)

    expect(status.active).toBe(1)
    expect(status.max).toBe(2)
    expect(status.servers).toHaveLength(1)
  })

  it('throws when project not found', () => {
    expect(() => getPoolStatus(db, 'nonexistent-project')).toThrow('Project not found')
  })
})
