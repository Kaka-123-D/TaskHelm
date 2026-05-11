import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  DevServerRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import type { Project, Task } from '@taskhelm/core'
import {
  startDevServer,
  stopDevServer,
  getPoolStatus,
  buildChildEnv,
  substitutePortPlaceholder,
} from '../src/dev-pool.js'

const TEST_DB = path.join(import.meta.dirname, '__test_dev_pool__.db')
let db: Database.Database
let project: Project
let task: Task
let logsDir: string

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

function listenOnPort(port: number, host = '127.0.0.1'): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(port, host, () => resolve(server))
  })
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise(resolve => {
    server.close(() => resolve())
  })
}

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)

  logsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-test-logs-'))

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
  fs.rmSync(logsDir, { recursive: true, force: true })
})

describe('substitutePortPlaceholder', () => {
  it('replaces {{port}} with the allocated port', () => {
    expect(substitutePortPlaceholder('npm run dev -- -p {{port}}', 1606)).toBe(
      'npm run dev -- -p 1606'
    )
  })

  it('handles whitespace and case variants', () => {
    expect(substitutePortPlaceholder('next dev -p {{ Port }}', 4242)).toBe('next dev -p 4242')
    expect(substitutePortPlaceholder('dev --port={{PORT}}', 3000)).toBe('dev --port=3000')
  })

  it('replaces multiple occurrences', () => {
    expect(substitutePortPlaceholder('echo {{port}} && start --port {{port}}', 8080)).toBe(
      'echo 8080 && start --port 8080'
    )
  })

  it('leaves the command unchanged when no placeholder is present', () => {
    expect(substitutePortPlaceholder('npm run dev', 5173)).toBe('npm run dev')
  })
})

describe('startDevServer', () => {
  it('creates a dev server record with status=running and valid PID', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19200,
      logsDir,
      healthcheckDelayMs: 0,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    expect(devServer.id).toBeTruthy()
    expect(devServer.project_id).toBe(project.id)
    expect(devServer.task_id).toBe(task.id)
    expect(devServer.port).toBe(19200)
    expect(devServer.status).toBe('running')
    expect(devServer.pid).toBeGreaterThan(0)
    expect(devServer.log_path).toMatch(/dev-server-.*\.log$/)
  })

  it('persists the dev server in DB with log_path set', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19201,
      logsDir,
      healthcheckDelayMs: 0,
    })

    if (devServer.pid) spawnedPids.push(devServer.pid)

    const repo = new DevServerRepository(db)
    const found = repo.findById(devServer.id)

    expect(found).not.toBeNull()
    expect(found!.status).toBe('running')
    expect(found!.pid).toBe(devServer.pid)
    expect(found!.log_path).toBeTruthy()
    expect(fs.existsSync(found!.log_path!)).toBe(true)
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
      const devServer = await startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: `node ${scriptPath}`,
        cwd: tempDir,
        port: 19203,
        logsDir,
        healthcheckDelayMs: 0,
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
    expect(childEnv.NODE_ENV).toBe('development')
    expect(childEnv.PORT).toBe('4242')
    // PATH preserves the parent's entry first (so user-preferred binaries win)
    // and appends the fallback locations where yarn/pnpm/bun typically live.
    const segments = (childEnv.PATH ?? '').split(path.delimiter)
    expect(segments[0]).toBe('/usr/bin')
    expect(segments).toContain('/opt/homebrew/bin')
    expect(segments).toContain('/usr/local/bin')
  })

  it('honors NVM_BIN and VOLTA_HOME from the parent env when augmenting PATH', () => {
    const parentEnv: NodeJS.ProcessEnv = {
      PATH: '/usr/bin',
      NVM_BIN: '/Users/test/.nvm/versions/node/v20/bin',
      VOLTA_HOME: '/Users/test/.volta',
    }

    const childEnv = buildChildEnv(parentEnv, 4243)
    const segments = (childEnv.PATH ?? '').split(path.delimiter)

    expect(segments).toContain('/Users/test/.nvm/versions/node/v20/bin')
    expect(segments).toContain('/Users/test/.volta/bin')
  })

  it('does not duplicate PATH entries the parent already had', () => {
    const parentEnv: NodeJS.ProcessEnv = {
      PATH: ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin'].join(path.delimiter),
    }

    const childEnv = buildChildEnv(parentEnv, 4244)
    const segments = (childEnv.PATH ?? '').split(path.delimiter)
    const homebrewCount = segments.filter(s => s === '/opt/homebrew/bin').length
    const usrLocalCount = segments.filter(s => s === '/usr/local/bin').length

    expect(homebrewCount).toBe(1)
    expect(usrLocalCount).toBe(1)
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
      const devServer = await startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: `node ${scriptPath}`,
        cwd: tempDir,
        port: 19204,
        logsDir,
        healthcheckDelayMs: 0,
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

  it('substitutes {{port}} in devCommand and writes child output to the log file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-dev-portsub-'))
    const scriptPath = path.join(tempDir, 'echo-port.js')
    fs.writeFileSync(
      scriptPath,
      [
        "console.log('hello from port=' + process.argv[2])",
        'setTimeout(() => {}, 60000)',
      ].join('\n'),
    )

    try {
      const devServer = await startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: `node ${scriptPath} {{port}}`,
        cwd: tempDir,
        port: 19260,
        logsDir,
        healthcheckDelayMs: 0,
      })

      if (devServer.pid) spawnedPids.push(devServer.pid)

      // Give the child a moment to flush stdout to the log
      await new Promise(resolve => setTimeout(resolve, 200))

      const logContents = fs.readFileSync(devServer.log_path!, 'utf-8')
      expect(logContents).toContain('hello from port=19260')
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('marks the server as failed and persists error_message when the child exits before healthcheck', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "console.error(\'boom\'); process.exit(1)"',
      cwd: os.tmpdir(),
      port: 19261,
      logsDir,
      healthcheckDelayMs: 200,
    }).catch((err: Error) => err)

    expect(devServer).toBeInstanceOf(Error)
    expect((devServer as Error).message).toMatch(/Process exited|boom/)

    const repo = new DevServerRepository(db)
    const all = repo.findByProjectId(project.id)
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('failed')
    expect(all[0].error_message).toBeTruthy()
    expect(all[0].log_path).toBeTruthy()
  })

  it('marks the server as failed when the child stays alive but never binds the port', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'sleep 60',
      cwd: os.tmpdir(),
      port: 19262,
      logsDir,
      healthcheckDelayMs: 250,
    }).catch((err: Error) => err)

    expect(devServer).toBeInstanceOf(Error)
    expect((devServer as Error).message).toMatch(/port 19262 is not in use/i)

    const repo = new DevServerRepository(db)
    const all = repo.findByProjectId(project.id)
    expect(all[0].status).toBe('failed')
  })

  it('passes the healthcheck when the child binds the expected port', async () => {
    // Pre-bind port 19263 in the test process so the healthcheck (which
    // verifies the port is in use AND the spawned PID is alive) can pass
    // even though the spawned child does not actually listen.
    const probe = await listenOnPort(19263)

    try {
      const devServer = await startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: 'sleep 60',
        cwd: os.tmpdir(),
        port: 19263,
        logsDir,
        healthcheckDelayMs: 200,
      })

      if (devServer.pid) spawnedPids.push(devServer.pid)

      expect(devServer.status).toBe('running')
    } finally {
      await closeServer(probe)
    }
  })

  // Regression test for v0.1.14: Next.js on macOS binds `::1` only. The
  // pre-fix probe used listen() on `127.0.0.1` and falsely reported the
  // port free, marking the dev server as failed.
  it('passes the healthcheck when the child binds only IPv6 loopback (::1)', async () => {
    const probe = await listenOnPort(19264, '::1')

    try {
      const devServer = await startDevServer({
        db,
        projectId: project.id,
        taskId: task.id,
        devCommand: 'sleep 60',
        cwd: os.tmpdir(),
        port: 19264,
        logsDir,
        healthcheckDelayMs: 200,
      })

      if (devServer.pid) spawnedPids.push(devServer.pid)

      expect(devServer.status).toBe('running')
    } finally {
      await closeServer(probe)
    }
  })

  it('throws when project not found', async () => {
    await expect(
      startDevServer({
        db,
        projectId: 'nonexistent-project',
        taskId: task.id,
        devCommand: 'node -e ""',
        cwd: os.tmpdir(),
        port: 19202,
        logsDir,
        healthcheckDelayMs: 0,
      })
    ).rejects.toThrow('Project not found')
  })

  it('throws when max_active_dev_servers is exceeded', async () => {
    // max is 2, fill it up
    const devServer1 = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19210,
      logsDir,
      healthcheckDelayMs: 0,
    })
    if (devServer1.pid) spawnedPids.push(devServer1.pid)

    const taskRepo = new TaskRepository(db)
    const task2 = taskRepo.create({ project_id: project.id, title: 'Task 2' })

    const devServer2 = await startDevServer({
      db,
      projectId: project.id,
      taskId: task2.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19211,
      logsDir,
      healthcheckDelayMs: 0,
    })
    if (devServer2.pid) spawnedPids.push(devServer2.pid)

    const task3 = taskRepo.create({ project_id: project.id, title: 'Task 3' })

    await expect(
      startDevServer({
        db,
        projectId: project.id,
        taskId: task3.id,
        devCommand: 'node -e "setTimeout(()=>{},60000)"',
        cwd: os.tmpdir(),
        port: 19212,
        logsDir,
        healthcheckDelayMs: 0,
      })
    ).rejects.toThrow('Max active dev servers')
  })
})

describe('stopDevServer', () => {
  it('sets status to stopped in DB and sends kill signal', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19220,
      logsDir,
      healthcheckDelayMs: 0,
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

  it('reflects started servers in pool status', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19230,
      logsDir,
      healthcheckDelayMs: 0,
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

describe('startDevServer with taskSubrepoId', () => {
  it('persists task_subrepo_id on the dev_servers row', async () => {
    const subrepo = new TaskSubrepoRepository(db).create({
      task_id: task.id,
      repo_path: 'repos/backend',
    })

    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      taskSubrepoId: subrepo.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19260,
      logsDir,
      healthcheckDelayMs: 0,
    })
    if (devServer.pid) spawnedPids.push(devServer.pid)

    expect(devServer.task_subrepo_id).toBe(subrepo.id)
    expect(new DevServerRepository(db).findByTaskSubrepoId(subrepo.id)?.id).toBe(devServer.id)
  })

  it('starts two servers for the same task with different subrepos', async () => {
    const projectRepo = new ProjectRepository(db)
    const projectWithRoom = projectRepo.create({
      name: 'roomy',
      slug: 'roomy',
      local_repo_root: '/tmp/roomy',
      max_active_dev_servers: 5,
    })
    const subRepoRepo = new TaskSubrepoRepository(db)
    const subA = subRepoRepo.create({ task_id: task.id, repo_path: 'repos/a' })
    const subB = subRepoRepo.create({ task_id: task.id, repo_path: 'repos/b' })

    const serverA = await startDevServer({
      db,
      projectId: projectWithRoom.id,
      taskId: task.id,
      taskSubrepoId: subA.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19261,
      logsDir,
      healthcheckDelayMs: 0,
    })
    if (serverA.pid) spawnedPids.push(serverA.pid)

    const serverB = await startDevServer({
      db,
      projectId: projectWithRoom.id,
      taskId: task.id,
      taskSubrepoId: subB.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19262,
      logsDir,
      healthcheckDelayMs: 0,
    })
    if (serverB.pid) spawnedPids.push(serverB.pid)

    expect(serverA.id).not.toBe(serverB.id)
    expect(serverA.task_subrepo_id).toBe(subA.id)
    expect(serverB.task_subrepo_id).toBe(subB.id)

    const allForTask = new DevServerRepository(db).findAllByTaskId(task.id)
    expect(allForTask.map(s => s.task_subrepo_id).sort()).toEqual([subA.id, subB.id].sort())
  })

  it('leaves task_subrepo_id NULL for outer-repo invocations (no flag passed)', async () => {
    const devServer = await startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: 'node -e "setTimeout(()=>{},60000)"',
      cwd: os.tmpdir(),
      port: 19263,
      logsDir,
      healthcheckDelayMs: 0,
    })
    if (devServer.pid) spawnedPids.push(devServer.pid)

    expect(devServer.task_subrepo_id).toBeNull()
  })
})
