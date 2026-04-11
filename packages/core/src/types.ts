// ─── Enums ────────────────────────────────────────────────────────────────────

export const TaskStatus = {
  draft: 'draft',
  ready: 'ready',
  running: 'running',
  reviewing: 'reviewing',
  blocked: 'blocked',
  done: 'done',
  archived: 'archived',
} as const
export type TaskStatusValue = (typeof TaskStatus)[keyof typeof TaskStatus]

export const TaskPhase = {
  context: 'context',
  planning: 'planning',
  implementation: 'implementation',
  spec_review: 'spec_review',
  code_review: 'code_review',
  runtime_verification: 'runtime_verification',
  final_summary: 'final_summary',
} as const
export type TaskPhaseValue = (typeof TaskPhase)[keyof typeof TaskPhase]

export const AgentRunKind = {
  implementer: 'implementer',
  spec_review: 'spec_review',
  code_review: 'code_review',
  runtime_verify: 'runtime_verify',
  manager_summary: 'manager_summary',
} as const
export type AgentRunKindValue = (typeof AgentRunKind)[keyof typeof AgentRunKind]

export const AgentRunStatus = {
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
} as const
export type AgentRunStatusValue = (typeof AgentRunStatus)[keyof typeof AgentRunStatus]

export const ReviewGateType = {
  spec_compliance: 'spec_compliance',
  code_quality: 'code_quality',
  runtime_verification: 'runtime_verification',
} as const
export type ReviewGateTypeValue = (typeof ReviewGateType)[keyof typeof ReviewGateType]

export const ReviewGateStatus = {
  pending: 'pending',
  open: 'open',
  passed: 'passed',
  failed: 'failed',
} as const
export type ReviewGateStatusValue = (typeof ReviewGateStatus)[keyof typeof ReviewGateStatus]

export const DevServerStatus = {
  warm: 'warm',
  sleeping: 'sleeping',
  starting: 'starting',
  running: 'running',
  failed: 'failed',
  stopped: 'stopped',
} as const
export type DevServerStatusValue = (typeof DevServerStatus)[keyof typeof DevServerStatus]

export const SpecdownMode = {
  disabled: 'disabled',
  linked: 'linked',
  preferred: 'preferred',
} as const
export type SpecdownModeValue = (typeof SpecdownMode)[keyof typeof SpecdownMode]

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
  readonly test_command: string | null
  readonly max_active_dev_servers: number
  readonly specdown_mode: SpecdownModeValue
  readonly specdown_project_ref: string | null
  readonly created_at: string
  readonly updated_at: string
}

export interface Task {
  readonly id: string
  readonly project_id: string
  readonly key: string | null
  readonly title: string
  readonly goal: string | null
  readonly source_type: string | null
  readonly source_ref: string | null
  readonly status: TaskStatusValue
  readonly phase: TaskPhaseValue
  readonly priority: number
  readonly branch_name: string | null
  readonly worktree_path: string | null
  readonly port: number | null
  readonly dev_server_state: DevServerStatusValue | null
  readonly current_agent_run_id: string | null
  readonly latest_blocker: string | null
  readonly created_at: string
  readonly updated_at: string
}

export interface AgentRun {
  readonly id: string
  readonly task_id: string
  readonly kind: AgentRunKindValue
  readonly role: string | null
  readonly status: AgentRunStatusValue
  readonly input_ref: string | null
  readonly output_ref: string | null
  readonly error_message: string | null
  readonly started_at: string | null
  readonly finished_at: string | null
  readonly created_at: string
}

export interface ReviewGate {
  readonly id: string
  readonly task_id: string
  readonly gate_type: ReviewGateTypeValue
  readonly status: ReviewGateStatusValue
  readonly result: string | null
  readonly notes_ref: string | null
  readonly opened_at: string | null
  readonly closed_at: string | null
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
