import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { DevServer, DevServerStatusValue } from '../types.js'

export interface CreateDevServerInput {
  readonly project_id: string
  readonly task_id?: string
  readonly port: number
  readonly status?: string
  readonly health_url?: string
}

type DevServerRow = {
  id: string
  project_id: string
  task_id: string | null
  port: number
  pid: number | null
  status: string
  health_url: string | null
  started_at: string | null
  stopped_at: string | null
}

function rowToDevServer(row: DevServerRow): DevServer {
  return {
    id: row.id,
    project_id: row.project_id,
    task_id: row.task_id,
    port: row.port,
    pid: row.pid,
    status: row.status as DevServerStatusValue,
    health_url: row.health_url,
    started_at: row.started_at,
    stopped_at: row.stopped_at,
  }
}

export class DevServerRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateDevServerInput): DevServer {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO dev_servers (id, project_id, task_id, port, pid, status, health_url, started_at, stopped_at)
         VALUES (@id, @project_id, @task_id, @port, @pid, @status, @health_url, @started_at, @stopped_at)`
      )
      .run({
        id,
        project_id: input.project_id,
        task_id: input.task_id ?? null,
        port: input.port,
        pid: null,
        status: input.status ?? 'starting',
        health_url: input.health_url ?? null,
        started_at: now,
        stopped_at: null,
      })

    const row = this.db
      .prepare('SELECT * FROM dev_servers WHERE id = ?')
      .get(id) as DevServerRow
    return rowToDevServer(row)
  }

  findById(id: string): DevServer | null {
    const row = this.db
      .prepare('SELECT * FROM dev_servers WHERE id = ?')
      .get(id) as DevServerRow | undefined
    return row ? rowToDevServer(row) : null
  }

  findByProjectId(projectId: string): readonly DevServer[] {
    const rows = this.db
      .prepare('SELECT * FROM dev_servers WHERE project_id = ? ORDER BY started_at ASC')
      .all(projectId) as DevServerRow[]
    return rows.map(rowToDevServer)
  }

  findByTaskId(taskId: string): DevServer | null {
    const row = this.db
      .prepare('SELECT * FROM dev_servers WHERE task_id = ?')
      .get(taskId) as DevServerRow | undefined
    return row ? rowToDevServer(row) : null
  }

  findByPort(port: number): DevServer | null {
    const row = this.db
      .prepare('SELECT * FROM dev_servers WHERE port = ?')
      .get(port) as DevServerRow | undefined
    return row ? rowToDevServer(row) : null
  }

  updateStatus(id: string, status: DevServerStatusValue): DevServer {
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`DevServer not found: ${id}`)
    }

    const now = new Date().toISOString()
    const stoppedAt = status === 'stopped' ? now : existing.stopped_at

    this.db
      .prepare(
        'UPDATE dev_servers SET status = @status, stopped_at = @stopped_at WHERE id = @id'
      )
      .run({ id, status, stopped_at: stoppedAt })

    const row = this.db
      .prepare('SELECT * FROM dev_servers WHERE id = ?')
      .get(id) as DevServerRow
    return rowToDevServer(row)
  }

  updatePid(id: string, pid: number): DevServer {
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`DevServer not found: ${id}`)
    }

    this.db.prepare('UPDATE dev_servers SET pid = @pid WHERE id = @id').run({ id, pid })

    const row = this.db
      .prepare('SELECT * FROM dev_servers WHERE id = ?')
      .get(id) as DevServerRow
    return rowToDevServer(row)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM dev_servers WHERE id = ?').run(id)
  }

  countActiveByProject(projectId: string): number {
    const result = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM dev_servers
         WHERE project_id = ? AND status IN ('starting', 'running', 'warm')`
      )
      .get(projectId) as { count: number }
    return result.count
  }
}
