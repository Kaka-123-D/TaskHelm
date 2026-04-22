import * as net from 'node:net'
import type Database from 'better-sqlite3'

export interface PortRange {
  readonly min: number
  readonly max: number
}

const DEFAULT_PORT_RANGE: PortRange = { min: 3001, max: 3100 } as const

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(false)
      }
    })

    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.listen(port, '127.0.0.1')
  })
}

export async function findAvailablePort(range?: PortRange): Promise<number> {
  const { min, max } = range ?? DEFAULT_PORT_RANGE

  for (let port = min; port <= max; port++) {
    const available = await isPortAvailable(port)
    if (available) {
      return port
    }
  }

  throw new Error(`No available port found in range ${min}-${max}`)
}

export async function allocatePort(
  db: Database.Database,
  projectId: string,
  taskId: string,
  range?: PortRange
): Promise<number> {
  const { min, max } = range ?? DEFAULT_PORT_RANGE

  // Get already-allocated ports from DB
  const rows = db
    .prepare('SELECT port FROM dev_servers WHERE port >= ? AND port <= ?')
    .all(min, max) as Array<{ port: number }>

  const allocatedPorts = new Set(rows.map((r) => r.port))

  for (let port = min; port <= max; port++) {
    if (allocatedPorts.has(port)) {
      continue
    }

    const available = await isPortAvailable(port)
    if (!available) {
      continue
    }

    // Register in DB
    const { nanoid } = await import('nanoid')
    const id = nanoid()
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO dev_servers (id, project_id, task_id, port, status, started_at)
       VALUES (@id, @project_id, @task_id, @port, @status, @started_at)`
    ).run({
      id,
      project_id: projectId,
      task_id: taskId,
      port,
      status: 'starting',
      started_at: now,
    })

    return port
  }

  throw new Error(`No available port found in range ${min}-${max}`)
}

export function releasePort(db: Database.Database, port: number): void {
  const row = db.prepare('SELECT id FROM dev_servers WHERE port = ?').get(port) as
    | { id: string }
    | undefined

  if (!row) {
    return
  }

  db.prepare('DELETE FROM dev_servers WHERE id = ?').run(row.id)
}
