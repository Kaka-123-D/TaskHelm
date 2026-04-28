# TaskHelm Domain Model

> **Note (v0.1.12+):** This document predates the removal of the AI-agent dispatch + 3-gate review pipeline. Sections referencing `agent_runs`, `review_gates`, `current_agent_run_id`, `runOneCycle`, the dispatcher, the scheduler, the supervisor event loop, or the `agent` CLI group no longer reflect the codebase. The rest of the doc — projects, tasks, worktrees, dev-pool, capsules — is still accurate.


## Top-Level Model

TaskHelm v1 is project-aware and task-centric.

That means:

- `Project` is the top-level boundary
- `Task` is the primary execution unit

## Primary Entities

### Project

A project represents one managed software initiative.

Fields:

- `id`
- `slug`
- `name`
- `description`
- `local_repo_root`
- `default_branch`
- `branch_naming_pattern`
- `worktree_root`
- `dev_command`
- `install_command`
- `max_active_dev_servers`
- `created_at`
- `updated_at`

Project responsibilities:

- defines repo and runtime policies
- owns a task namespace
- owns task board and ops policy

### Task

A task is a managed work item inside a project.

Fields:

- `id`
- `project_id`
- `key`
- `title`
- `goal`
- `refer_link`
- `priority`
- `branch_name`
- `workspace_name`
- `workspace_branch`
- `workspace_subrepo_branches_json`
- `preferred_port`
- `worktree_path`
- `port`
- `dev_server_state`
- `context_vault_root_path`
- `context_vault_sources_json`
- `context_vault_files_json`
- `context_vault_selected_file`
- `current_agent_run_id`
- `latest_blocker`
- `created_at`
- `updated_at`

### AgentRun

An agent run is one bounded execution of a worker or reviewer.

Fields:

- `id`
- `task_id`
- `kind`
- `role`
- `status`
- `input_ref`
- `output_ref`
- `started_at`
- `finished_at`

Kinds:

- `implementer`
- `spec_review`
- `code_review`
- `runtime_verify`
- `manager_summary`

### ReviewGate

Represents one review stage for a task.

Fields:

- `id`
- `task_id`
- `gate_type`
- `status`
- `result`
- `notes_ref`
- `opened_at`
- `closed_at`

Gate types:

- `spec_compliance`
- `code_quality`
- `runtime_verification`

### DevServer

Represents one local managed process.

Fields:

- `id`
- `project_id`
- `task_id`
- `port`
- `pid`
- `status`
- `health_url`
- `started_at`
- `stopped_at`

Statuses:

- `warm`
- `sleeping`
- `starting`
- `running`
- `failed`
- `stopped`

## Relationships

- one `Project` has many `Task`
- one `Task` has many `AgentRun`
- one `Task` has many `ReviewGate`
- one `Task` may have zero or one active `DevServer`

## Storage Split

Human-facing truth:

- project docs
- task docs
- review notes
- handoffs

Runtime-facing truth:

- locks
- pids
- ports
- event sequencing
- agent lifecycle
