import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { TaskSubrepo, DevServerStatusValue } from '../types.js'

export interface CreateTaskSubrepoInput {
  readonly task_id: string
  readonly repo_path: string
  readonly branch_name?: string | null
  readonly worktree_path?: string | null
  readonly preferred_port?: number | null
  readonly dev_command?: string | null
  readonly dev_server_state?: DevServerStatusValue | null
}

export interface UpdateTaskSubrepoInput {
  readonly branch_name?: string | null
  readonly worktree_path?: string | null
  readonly preferred_port?: number | null
  readonly dev_command?: string | null
  readonly dev_server_state?: DevServerStatusValue | null
}

type TaskSubrepoRow = {
  id: string
  task_id: string
  repo_path: string
  branch_name: string | null
  worktree_path: string | null
  preferred_port: number | null
  dev_command: string | null
  dev_server_state: string | null
  created_at: string
  updated_at: string
}

function rowToTaskSubrepo(row: TaskSubrepoRow): TaskSubrepo {
  return {
    id: row.id,
    task_id: row.task_id,
    repo_path: row.repo_path,
    branch_name: row.branch_name,
    worktree_path: row.worktree_path,
    preferred_port: row.preferred_port,
    dev_command: row.dev_command,
    dev_server_state: row.dev_server_state as DevServerStatusValue | null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export class TaskSubrepoRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateTaskSubrepoInput): TaskSubrepo {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO task_subrepos (
          id, task_id, repo_path,
          branch_name, worktree_path,
          preferred_port, dev_command, dev_server_state,
          created_at, updated_at
        ) VALUES (
          @id, @task_id, @repo_path,
          @branch_name, @worktree_path,
          @preferred_port, @dev_command, @dev_server_state,
          @created_at, @updated_at
        )`
      )
      .run({
        id,
        task_id: input.task_id,
        repo_path: input.repo_path,
        branch_name: input.branch_name ?? null,
        worktree_path: input.worktree_path ?? null,
        preferred_port: input.preferred_port ?? null,
        dev_command: input.dev_command ?? null,
        dev_server_state: input.dev_server_state ?? null,
        created_at: now,
        updated_at: now,
      })

    const row = this.db
      .prepare('SELECT * FROM task_subrepos WHERE id = ?')
      .get(id) as TaskSubrepoRow
    return rowToTaskSubrepo(row)
  }

  findById(id: string): TaskSubrepo | null {
    const row = this.db
      .prepare('SELECT * FROM task_subrepos WHERE id = ?')
      .get(id) as TaskSubrepoRow | undefined
    return row ? rowToTaskSubrepo(row) : null
  }

  findByTaskId(taskId: string): readonly TaskSubrepo[] {
    const rows = this.db
      .prepare('SELECT * FROM task_subrepos WHERE task_id = ? ORDER BY repo_path ASC')
      .all(taskId) as TaskSubrepoRow[]
    return rows.map(rowToTaskSubrepo)
  }

  findByTaskIdAndRepoPath(taskId: string, repoPath: string): TaskSubrepo | null {
    const row = this.db
      .prepare('SELECT * FROM task_subrepos WHERE task_id = ? AND repo_path = ?')
      .get(taskId, repoPath) as TaskSubrepoRow | undefined
    return row ? rowToTaskSubrepo(row) : null
  }

  update(id: string, input: UpdateTaskSubrepoInput): TaskSubrepo {
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`TaskSubrepo not found: ${id}`)
    }

    const now = new Date().toISOString()

    this.db
      .prepare(
        `UPDATE task_subrepos SET
          branch_name = @branch_name,
          worktree_path = @worktree_path,
          preferred_port = @preferred_port,
          dev_command = @dev_command,
          dev_server_state = @dev_server_state,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id,
        branch_name:
          input.branch_name !== undefined ? input.branch_name : existing.branch_name,
        worktree_path:
          input.worktree_path !== undefined ? input.worktree_path : existing.worktree_path,
        preferred_port:
          input.preferred_port !== undefined ? input.preferred_port : existing.preferred_port,
        dev_command:
          input.dev_command !== undefined ? input.dev_command : existing.dev_command,
        dev_server_state:
          input.dev_server_state !== undefined
            ? input.dev_server_state
            : existing.dev_server_state,
        updated_at: now,
      })

    const row = this.db
      .prepare('SELECT * FROM task_subrepos WHERE id = ?')
      .get(id) as TaskSubrepoRow
    return rowToTaskSubrepo(row)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM task_subrepos WHERE id = ?').run(id)
  }

  deleteByTaskId(taskId: string): void {
    this.db.prepare('DELETE FROM task_subrepos WHERE task_id = ?').run(taskId)
  }
}
