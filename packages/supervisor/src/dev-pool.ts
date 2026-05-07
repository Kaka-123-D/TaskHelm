import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as http from 'node:http'
import * as https from 'node:https'
import * as net from 'node:net'
import type Database from 'better-sqlite3'
import { DevServerRepository, ProjectRepository } from '@taskhelm/core'
import type { DevServer } from '@taskhelm/core'

export interface StartServerOptions {
  readonly db: Database.Database
  readonly projectId: string
  readonly taskId: string
  readonly devCommand: string
  readonly cwd: string
  readonly port: number
  readonly healthUrl?: string
  /** Directory for per-server log files. Defaults to `~/.taskhelm/logs`. */
  readonly logsDir?: string
  /** Delay (ms) before verifying the child is alive and the port is in use. */
  readonly healthcheckDelayMs?: number
}

// Strip env vars that the TaskHelm Next standalone runtime injects into its own
// process. These belong to TaskHelm's Next 15 build and break user dev servers
// that inherit them — most importantly __NEXT_PRIVATE_STANDALONE_CONFIG, which
// makes a child `next dev` think it is a Next 15 standalone server with a
// config schema it cannot parse.
const LEAKY_ENV_PREFIXES = ['__NEXT_PRIVATE_', 'NEXT_RUNTIME']
const LEAKY_ENV_KEYS = new Set(['HOSTNAME', 'KEEP_ALIVE_TIMEOUT'])

const DEFAULT_HEALTHCHECK_DELAY_MS = 3500
const ERROR_LOG_TAIL_BYTES = 4096

export function buildChildEnv(
  parentEnv: NodeJS.ProcessEnv,
  port: number,
): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...parentEnv }

  for (const key of Object.keys(next)) {
    if (LEAKY_ENV_KEYS.has(key)) {
      delete next[key]
      continue
    }
    if (LEAKY_ENV_PREFIXES.some(prefix => key.startsWith(prefix))) {
      delete next[key]
    }
  }

  next.NODE_ENV = 'development'
  next.PORT = String(port)
  return next
}

/**
 * Substitute {{port}} (case-insensitive) in a dev command template with the
 * allocated port. Lets users write commands like `npm run dev -- -p {{port}}`
 * to override scripts that hard-code a port.
 */
export function substitutePortPlaceholder(template: string, port: number): string {
  return template.replace(/\{\{\s*port\s*\}\}/gi, String(port))
}

function defaultLogsDir(): string {
  return path.join(os.homedir(), '.taskhelm', 'logs')
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// Probe whether a port is currently accepting TCP connections on either the
// IPv4 or IPv6 loopback. We can't use listen()-based detection: when the dev
// server binds only `::1` (IPv6 loopback) — common for Next.js on macOS — a
// listen() probe on `127.0.0.1` succeeds and falsely reports the port free.
// Connecting works regardless of which loopback the server chose.
function tryConnect(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket()
    let settled = false
    const finish = (bound: boolean): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(bound)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.once('timeout', () => finish(false))
    socket.connect(port, host)
  })
}

async function isPortBound(port: number, timeoutMs = 1000): Promise<boolean> {
  const results = await Promise.all([
    tryConnect('127.0.0.1', port, timeoutMs),
    tryConnect('::1', port, timeoutMs),
  ])
  return results.some(Boolean)
}

function tailLogFile(logPath: string): string {
  try {
    const stat = fs.statSync(logPath)
    const fd = fs.openSync(logPath, 'r')
    try {
      const length = Math.min(stat.size, ERROR_LOG_TAIL_BYTES)
      const buf = Buffer.alloc(length)
      fs.readSync(fd, buf, 0, length, Math.max(0, stat.size - length))
      return buf.toString('utf-8').trim()
    } finally {
      fs.closeSync(fd)
    }
  } catch {
    return ''
  }
}

export interface StartDevServerResult {
  readonly devServer: DevServer
  readonly errorMessage: string | null
}

export async function startDevServer(
  options: StartServerOptions
): Promise<DevServer> {
  const result = await startDevServerWithDiagnostics(options)
  if (result.devServer.status === 'failed') {
    throw new Error(result.errorMessage ?? 'Dev server failed to start')
  }
  return result.devServer
}

/**
 * Lower-level entry point that returns the dev server row plus the error
 * message captured from the log when the healthcheck fails. Callers (API,
 * CLI) can use this to surface diagnostics to the user without re-querying.
 */
export async function startDevServerWithDiagnostics(
  options: StartServerOptions
): Promise<StartDevServerResult> {
  const {
    db,
    projectId,
    taskId,
    devCommand,
    cwd,
    port,
    healthUrl,
    logsDir = defaultLogsDir(),
    healthcheckDelayMs = DEFAULT_HEALTHCHECK_DELAY_MS,
  } = options

  const projectRepo = new ProjectRepository(db)
  const project = projectRepo.findById(projectId)
  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const devServerRepo = new DevServerRepository(db)

  // 1. Check max_active_dev_servers for project
  const activeCount = devServerRepo.countActiveByProject(projectId)
  if (activeCount >= project.max_active_dev_servers) {
    throw new Error(
      `Max active dev servers (${project.max_active_dev_servers}) reached for project ${projectId}`
    )
  }

  // 2. Ensure logs dir, then create dev_server record
  fs.mkdirSync(logsDir, { recursive: true })

  let devServer = devServerRepo.create({
    project_id: projectId,
    task_id: taskId,
    port,
    status: 'starting',
    health_url: healthUrl,
  })

  const logPath = path.join(logsDir, `dev-server-${devServer.id}.log`)
  // Persist the log path so the API/UI can point users to it even if the
  // process never reaches the running state.
  db.prepare('UPDATE dev_servers SET log_path = ? WHERE id = ?').run(logPath, devServer.id)

  const logFd = fs.openSync(logPath, 'a')
  fs.writeSync(
    logFd,
    `[taskhelm] ${new Date().toISOString()} starting "${devCommand}" (port ${port})\n`
  )

  // 3. Spawn child process with stdout/stderr piped to the log file
  const renderedCommand = substitutePortPlaceholder(devCommand, port)
  const parts = renderedCommand.trim().split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)

  let child: ReturnType<typeof spawn>
  try {
    child = spawn(cmd, args, {
      cwd,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: buildChildEnv(process.env, port),
    })
  } finally {
    fs.closeSync(logFd)
  }

  child.unref()

  if (child.pid === undefined) {
    devServerRepo.updateStatus(devServer.id, 'failed')
    const message = `Failed to spawn process for command: ${renderedCommand}`
    devServer = devServerRepo.updateErrorMessage(devServer.id, message)
    return { devServer, errorMessage: message }
  }

  // 4. Mark as running with PID
  const childPid = child.pid
  devServerRepo.updatePid(devServer.id, childPid)
  devServer = devServerRepo.updateStatus(devServer.id, 'running')

  // 5. Delayed healthcheck — verify the child stayed alive AND bound the port
  if (healthcheckDelayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, healthcheckDelayMs))

    const alive = isPidAlive(childPid)
    const bound = await isPortBound(port)

    if (!alive || !bound) {
      // Best-effort kill in case the process is alive but did not bind
      if (alive) {
        try {
          process.kill(childPid, 'SIGTERM')
        } catch {
          // ignore
        }
      }

      const tail = tailLogFile(logPath)
      const reason = !alive
        ? 'Process exited before healthcheck'
        : `Process is alive but port ${port} is not in use`
      const message = tail
        ? `${reason}. Last log output:\n${tail}`
        : `${reason}. See log: ${logPath}`

      devServerRepo.updateErrorMessage(devServer.id, message)
      devServer = devServerRepo.updateStatus(devServer.id, 'failed')
      return { devServer, errorMessage: message }
    }
  }

  return { devServer, errorMessage: null }
}

export function stopDevServer(db: Database.Database, serverId: string): void {
  const devServerRepo = new DevServerRepository(db)
  const server = devServerRepo.findById(serverId)

  if (!server) {
    throw new Error(`DevServer not found: ${serverId}`)
  }

  // 2. Kill process by PID if still running
  if (server.pid !== null) {
    try {
      process.kill(server.pid, 'SIGTERM')
    } catch {
      // Process may already be gone — ignore
    }
  }

  // 3. Update status to stopped, set stopped_at
  devServerRepo.updateStatus(serverId, 'stopped')
}

export function checkServerHealth(db: Database.Database, serverId: string): boolean {
  const devServerRepo = new DevServerRepository(db)
  const server = devServerRepo.findById(serverId)

  if (!server) {
    return false
  }

  if (server.health_url) {
    // Try HTTP GET
    return new Promise<boolean>((resolve) => {
      const url = new URL(server.health_url!)
      const requester = url.protocol === 'https:' ? https : http

      const req = requester.get(server.health_url!, { timeout: 3000 }, (res) => {
        const alive = res.statusCode !== undefined && res.statusCode < 500
        if (!alive) {
          devServerRepo.updateStatus(serverId, 'failed')
        }
        resolve(alive)
      })

      req.on('error', () => {
        devServerRepo.updateStatus(serverId, 'failed')
        resolve(false)
      })

      req.on('timeout', () => {
        req.destroy()
        devServerRepo.updateStatus(serverId, 'failed')
        resolve(false)
      })
    }) as unknown as boolean
  }

  // No health_url: check if PID is still alive
  if (server.pid !== null) {
    try {
      process.kill(server.pid, 0)
      return true
    } catch {
      devServerRepo.updateStatus(serverId, 'failed')
      return false
    }
  }

  return false
}

export function getPoolStatus(
  db: Database.Database,
  projectId: string
): {
  readonly active: number
  readonly max: number
  readonly servers: readonly DevServer[]
} {
  const projectRepo = new ProjectRepository(db)
  const devServerRepo = new DevServerRepository(db)

  const project = projectRepo.findById(projectId)
  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const servers = devServerRepo.findByProjectId(projectId)
  const active = devServerRepo.countActiveByProject(projectId)

  return {
    active,
    max: project.max_active_dev_servers,
    servers,
  }
}
