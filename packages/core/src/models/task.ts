import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { Task, TaskStatusValue, TaskPhaseValue, DevServerStatusValue } from '../types.js'

export interface CreateTaskInput {
  readonly project_id: string
  readonly title: string
  readonly key?: string
  readonly goal?: string
  readonly source_type?: string
  readonly source_ref?: string
  readonly priority?: number
}

export interface UpdateTaskInput {
  readonly title?: string
  readonly goal?: string
  readonly key?: string
  readonly source_type?: string
  readonly source_ref?: string
  readonly priority?: number
  readonly branch_name?: string
  readonly worktree_path?: string
  readonly port?: number
  readonly dev_server_state?: string
  readonly current_agent_run_id?: string
  readonly latest_blocker?: string | null
}

type TaskRow = {
  id: string
  project_id: string
  key: string | null
  title: string
  goal: string | null
  source_type: string | null
  source_ref: string | null
  status: string
  phase: string
  priority: number
  branch_name: string | null
  worktree_path: string | null
  port: number | null
  dev_server_state: string | null
  current_agent_run_id: string | null
  latest_blocker: string | null
  created_at: string
  updated_at: string
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    project_id: row.project_id,
    key: row.key,
    title: row.title,
    goal: row.goal,
    source_type: row.source_type,
    source_ref: row.source_ref,
    status: row.status as TaskStatusValue,
    phase: row.phase as TaskPhaseValue,
    priority: row.priority,
    branch_name: row.branch_name,
    worktree_path: row.worktree_path,
    port: row.port,
    dev_server_state: row.dev_server_state as DevServerStatusValue | null,
    current_agent_run_id: row.current_agent_run_id,
    latest_blocker: row.latest_blocker,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export class TaskRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateTaskInput): Task {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO tasks (
          id, project_id, key, title, goal,
          source_type, source_ref, status, phase, priority,
          branch_name, worktree_path, port, dev_server_state,
          current_agent_run_id, latest_blocker, created_at, updated_at
        ) VALUES (
          @id, @project_id, @key, @title, @goal,
          @source_type, @source_ref, @status, @phase, @priority,
          @branch_name, @worktree_path, @port, @dev_server_state,
          @current_agent_run_id, @latest_blocker, @created_at, @updated_at
        )`
      )
      .run({
        id,
        project_id: input.project_id,
        key: input.key ?? null,
        title: input.title,
        goal: input.goal ?? null,
        source_type: input.source_type ?? null,
        source_ref: input.source_ref ?? null,
        status: 'draft',
        phase: 'context',
        priority: input.priority ?? 0,
        branch_name: null,
        worktree_path: null,
        port: null,
        dev_server_state: null,
        current_agent_run_id: null,
        latest_blocker: null,
        created_at: now,
        updated_at: now,
      })

    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow
    return rowToTask(row)
  }

  findById(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined
    return row ? rowToTask(row) : null
  }

  findByProjectId(projectId: string): readonly Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC')
      .all(projectId) as TaskRow[]
    return rows.map(rowToTask)
  }

  update(id: string, input: UpdateTaskInput): Task {
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Task not found: ${id}`)
    }

    const now = new Date().toISOString()

    this.db
      .prepare(
        `UPDATE tasks SET
          title = @title,
          goal = @goal,
          key = @key,
          source_type = @source_type,
          source_ref = @source_ref,
          priority = @priority,
          branch_name = @branch_name,
          worktree_path = @worktree_path,
          port = @port,
          dev_server_state = @dev_server_state,
          current_agent_run_id = @current_agent_run_id,
          latest_blocker = @latest_blocker,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id,
        title: input.title ?? existing.title,
        goal: input.goal !== undefined ? input.goal : existing.goal,
        key: input.key !== undefined ? input.key : existing.key,
        source_type: input.source_type !== undefined ? input.source_type : existing.source_type,
        source_ref: input.source_ref !== undefined ? input.source_ref : existing.source_ref,
        priority: input.priority !== undefined ? input.priority : existing.priority,
        branch_name: input.branch_name !== undefined ? input.branch_name : existing.branch_name,
        worktree_path:
          input.worktree_path !== undefined ? input.worktree_path : existing.worktree_path,
        port: input.port !== undefined ? input.port : existing.port,
        dev_server_state:
          input.dev_server_state !== undefined
            ? input.dev_server_state
            : existing.dev_server_state,
        current_agent_run_id:
          input.current_agent_run_id !== undefined
            ? input.current_agent_run_id
            : existing.current_agent_run_id,
        latest_blocker:
          input.latest_blocker !== undefined ? input.latest_blocker : existing.latest_blocker,
        updated_at: now,
      })

    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow
    return rowToTask(row)
  }

  updateStatus(id: string, status: TaskStatusValue): Task {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE tasks SET status = @status, updated_at = @updated_at WHERE id = @id')
      .run({ id, status, updated_at: now })

    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow
    return rowToTask(row)
  }

  updatePhase(id: string, phase: TaskPhaseValue): Task {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE tasks SET phase = @phase, updated_at = @updated_at WHERE id = @id')
      .run({ id, phase, updated_at: now })

    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow
    return rowToTask(row)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }
}
