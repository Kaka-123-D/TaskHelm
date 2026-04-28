// ─── Enums ────────────────────────────────────────────────────────────────────

export const DevServerStatus = {
  warm: 'warm',
  sleeping: 'sleeping',
  starting: 'starting',
  running: 'running',
  failed: 'failed',
  stopped: 'stopped',
} as const
export type DevServerStatusValue = (typeof DevServerStatus)[keyof typeof DevServerStatus]

export const NotificationLevel = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'success',
} as const
export type NotificationLevelValue = (typeof NotificationLevel)[keyof typeof NotificationLevel]

// ─── Entity Interfaces ────────────────────────────────────────────────────────

export interface Project {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string | null
  readonly local_repo_root: string
  readonly default_branch: string | null
  readonly branch_naming_pattern: string | null
  readonly worktree_root: string | null
  readonly dev_command: string | null
  readonly install_command: string | null
  readonly max_active_dev_servers: number
  readonly created_at: string
  readonly updated_at: string
}

export interface Task {
  readonly id: string
  readonly project_id: string
  readonly key: string | null
  readonly title: string
  readonly goal: string | null
  readonly refer_link: string | null
  readonly priority: number
  readonly branch_name: string | null
  readonly workspace_name: string | null
  readonly workspace_branch: string | null
  readonly workspace_subrepo_branches_json: string | null
  readonly preferred_port: number | null
  readonly worktree_path: string | null
  readonly port: number | null
  readonly dev_server_state: DevServerStatusValue | null
  readonly context_vault_root_path: string | null
  readonly context_vault_sources_json: string | null
  readonly context_vault_files_json: string | null
  readonly context_vault_selected_file: string | null
  readonly latest_blocker: string | null
  readonly created_at: string
  readonly updated_at: string
}

export interface DevServer {
  readonly id: string
  readonly project_id: string
  readonly task_id: string | null
  readonly port: number
  readonly pid: number | null
  readonly status: DevServerStatusValue
  readonly health_url: string | null
  readonly started_at: string | null
  readonly stopped_at: string | null
}

export interface Notification {
  readonly id: string
  readonly task_id: string | null
  readonly project_id: string | null
  readonly level: NotificationLevelValue
  readonly channel: string
  readonly title: string
  readonly body: string | null
  readonly status: string
  readonly created_at: string
  readonly delivered_at: string | null
}

export interface Lock {
  readonly key: string
  readonly owner: string
  readonly expires_at: string | null
  readonly created_at: string
}

export interface AppEvent {
  readonly id: string
  readonly entity_type: string
  readonly entity_id: string
  readonly event_type: string
  readonly payload_json: string | null
  readonly created_at: string
}
