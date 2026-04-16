import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { Task, DevServerStatusValue } from '../types.js'

export interface CreateTaskInput {
  readonly project_id: string
  readonly title: string
  readonly key?: string
  readonly goal?: string
  readonly refer_link?: string
  readonly priority?: number
}

export interface UpdateTaskInput {
  readonly title?: string
  readonly goal?: string
  readonly key?: string
  readonly refer_link?: string | null
  readonly priority?: number
  readonly branch_name?: string | null
  readonly workspace_name?: string | null
  readonly workspace_branch?: string | null
  readonly workspace_subrepo_branches_json?: string | null
  readonly preferred_port?: number | null
  readonly worktree_path?: string | null
  readonly port?: number | null
  readonly dev_server_state?: string
  readonly context_vault_root_path?: string | null
  readonly context_vault_sources_json?: string | null
  readonly context_vault_files_json?: string | null
  readonly context_vault_selected_file?: string | null
  readonly current_agent_run_id?: string
  readonly latest_blocker?: string | null
}

type TaskRow = {
  id: string
  project_id: string
  key: string | null
  title: string
  goal: string | null
  refer_link: string | null
  priority: number
  branch_name: string | null
  workspace_name: string | null
  workspace_branch: string | null
  workspace_subrepo_branches_json: string | null
  preferred_port: number | null
  worktree_path: string | null
  port: number | null
  dev_server_state: string | null
  context_vault_root_path: string | null
  context_vault_sources_json: string | null
  context_vault_files_json: string | null
  context_vault_selected_file: string | null
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
    refer_link: row.refer_link,
    priority: row.priority,
    branch_name: row.branch_name,
    workspace_name: row.workspace_name,
    workspace_branch: row.workspace_branch,
    workspace_subrepo_branches_json: row.workspace_subrepo_branches_json,
    preferred_port: row.preferred_port,
    worktree_path: row.worktree_path,
    port: row.port,
    dev_server_state: row.dev_server_state as DevServerStatusValue | null,
    context_vault_root_path: row.context_vault_root_path,
    context_vault_sources_json: row.context_vault_sources_json,
    context_vault_files_json: row.context_vault_files_json,
    context_vault_selected_file: row.context_vault_selected_file,
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
          refer_link, priority,
          branch_name, workspace_name, workspace_branch, workspace_subrepo_branches_json, preferred_port,
          worktree_path, port, dev_server_state,
          context_vault_root_path, context_vault_sources_json, context_vault_files_json, context_vault_selected_file,
          current_agent_run_id, latest_blocker, created_at, updated_at
        ) VALUES (
          @id, @project_id, @key, @title, @goal,
          @refer_link, @priority,
          @branch_name, @workspace_name, @workspace_branch, @workspace_subrepo_branches_json, @preferred_port,
          @worktree_path, @port, @dev_server_state,
          @context_vault_root_path, @context_vault_sources_json, @context_vault_files_json, @context_vault_selected_file,
          @current_agent_run_id, @latest_blocker, @created_at, @updated_at
        )`
      )
      .run({
        id,
        project_id: input.project_id,
        key: input.key ?? null,
        title: input.title,
        goal: input.goal ?? null,
        refer_link: input.refer_link ?? null,
        priority: input.priority ?? 0,
        branch_name: null,
        workspace_name: null,
        workspace_branch: null,
        workspace_subrepo_branches_json: null,
        preferred_port: null,
        worktree_path: null,
        port: null,
        dev_server_state: null,
        context_vault_root_path: null,
        context_vault_sources_json: null,
        context_vault_files_json: null,
        context_vault_selected_file: null,
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
          refer_link = @refer_link,
          priority = @priority,
          branch_name = @branch_name,
          workspace_name = @workspace_name,
          workspace_branch = @workspace_branch,
          workspace_subrepo_branches_json = @workspace_subrepo_branches_json,
          preferred_port = @preferred_port,
          worktree_path = @worktree_path,
          port = @port,
          dev_server_state = @dev_server_state,
          context_vault_root_path = @context_vault_root_path,
          context_vault_sources_json = @context_vault_sources_json,
          context_vault_files_json = @context_vault_files_json,
          context_vault_selected_file = @context_vault_selected_file,
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
        refer_link: input.refer_link !== undefined ? input.refer_link : existing.refer_link,
        priority: input.priority !== undefined ? input.priority : existing.priority,
        branch_name: input.branch_name !== undefined ? input.branch_name : existing.branch_name,
        workspace_name:
          input.workspace_name !== undefined ? input.workspace_name : existing.workspace_name,
        workspace_branch:
          input.workspace_branch !== undefined ? input.workspace_branch : existing.workspace_branch,
        workspace_subrepo_branches_json:
          input.workspace_subrepo_branches_json !== undefined
            ? input.workspace_subrepo_branches_json
            : existing.workspace_subrepo_branches_json,
        preferred_port:
          input.preferred_port !== undefined ? input.preferred_port : existing.preferred_port,
        worktree_path:
          input.worktree_path !== undefined ? input.worktree_path : existing.worktree_path,
        port: input.port !== undefined ? input.port : existing.port,
        dev_server_state:
          input.dev_server_state !== undefined
            ? input.dev_server_state
            : existing.dev_server_state,
        context_vault_root_path:
          input.context_vault_root_path !== undefined
            ? input.context_vault_root_path
            : existing.context_vault_root_path,
        context_vault_sources_json:
          input.context_vault_sources_json !== undefined
            ? input.context_vault_sources_json
            : existing.context_vault_sources_json,
        context_vault_files_json:
          input.context_vault_files_json !== undefined
            ? input.context_vault_files_json
            : existing.context_vault_files_json,
        context_vault_selected_file:
          input.context_vault_selected_file !== undefined
            ? input.context_vault_selected_file
            : existing.context_vault_selected_file,
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

  delete(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }
}
