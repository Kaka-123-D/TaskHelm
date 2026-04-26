import { spawn } from 'node:child_process'
import * as http from 'node:http'
import * as https from 'node:https'
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
}

export function startDevServer(options: StartServerOptions): DevServer {
  const { db, projectId, taskId, devCommand, cwd, port, healthUrl } = options

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

  // 2. Create dev_server record (status=starting)
  let devServer = devServerRepo.create({
    project_id: projectId,
    task_id: taskId,
    port,
    status: 'starting',
    health_url: healthUrl,
  })

  // 3. Spawn child process
  const parts = devCommand.split(/\s+/)
  const cmd = parts[0]
  const args = parts.slice(1)

  const child = spawn(cmd, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'development', PORT: String(port) },
  })

  child.unref()

  if (child.pid === undefined) {
    devServerRepo.updateStatus(devServer.id, 'failed')
    throw new Error(`Failed to spawn dev server process for command: ${devCommand}`)
  }

  // 4. Update record with PID (status=running)
  devServer = devServerRepo.updatePid(devServer.id, child.pid)
  devServer = devServerRepo.updateStatus(devServer.id, 'running')

  return devServer
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
