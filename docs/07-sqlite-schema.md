# TaskHelm SQLite Schema

## Purpose

SQLite stores dynamic runtime state that should not depend on chat memory or Markdown parsing alone.

## Tables

### `projects`

Core project registry.

Suggested columns:

- `id TEXT PRIMARY KEY`
- `slug TEXT UNIQUE NOT NULL`
- `name TEXT NOT NULL`
- `description TEXT`
- `local_repo_root TEXT NOT NULL`
- `default_branch TEXT`
- `branch_naming_pattern TEXT`
- `worktree_root TEXT`
- `dev_command TEXT`
- `install_command TEXT`
- `test_command TEXT`
- `max_active_dev_servers INTEGER DEFAULT 1`
- `specdown_mode TEXT NOT NULL DEFAULT 'disabled'`
- `specdown_project_ref TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `tasks`

- `id TEXT PRIMARY KEY`
- `project_id TEXT NOT NULL`
- `key TEXT`
- `title TEXT NOT NULL`
- `goal TEXT`
- `source_type TEXT`
- `source_ref TEXT`
- `status TEXT NOT NULL`
- `phase TEXT NOT NULL`
- `priority INTEGER DEFAULT 0`
- `branch_name TEXT`
- `worktree_path TEXT`
- `port INTEGER`
- `dev_server_state TEXT`
- `current_agent_run_id TEXT`
- `latest_blocker TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Indexes:

- `idx_tasks_project_id`
- `idx_tasks_status`
- `idx_tasks_phase`

### `agent_runs`

- `id TEXT PRIMARY KEY`
- `task_id TEXT NOT NULL`
- `kind TEXT NOT NULL`
- `role TEXT`
- `status TEXT NOT NULL`
- `input_ref TEXT`
- `output_ref TEXT`
- `error_message TEXT`
- `started_at TEXT`
- `finished_at TEXT`
- `created_at TEXT NOT NULL`

Indexes:

- `idx_agent_runs_task_id`
- `idx_agent_runs_status`

### `review_gates`

- `id TEXT PRIMARY KEY`
- `task_id TEXT NOT NULL`
- `gate_type TEXT NOT NULL`
- `status TEXT NOT NULL`
- `result TEXT`
- `notes_ref TEXT`
- `opened_at TEXT`
- `closed_at TEXT`

Unique constraint:

- `(task_id, gate_type)`

### `dev_servers`

- `id TEXT PRIMARY KEY`
- `project_id TEXT NOT NULL`
- `task_id TEXT`
- `port INTEGER NOT NULL`
- `pid INTEGER`
- `status TEXT NOT NULL`
- `health_url TEXT`
- `started_at TEXT`
- `stopped_at TEXT`

Indexes:

- `idx_dev_servers_project_id`
- `idx_dev_servers_status`
- unique `port`

### `notifications`

- `id TEXT PRIMARY KEY`
- `task_id TEXT`
- `project_id TEXT`
- `level TEXT NOT NULL`
- `channel TEXT NOT NULL`
- `title TEXT NOT NULL`
- `body TEXT`
- `status TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `delivered_at TEXT`

### `locks`

Used for local concurrency safety.

- `key TEXT PRIMARY KEY`
- `owner TEXT NOT NULL`
- `expires_at TEXT`
- `created_at TEXT NOT NULL`

### `events`

Append-only event log.

- `id TEXT PRIMARY KEY`
- `entity_type TEXT NOT NULL`
- `entity_id TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `payload_json TEXT`
- `created_at TEXT NOT NULL`

Indexes:

- `idx_events_entity`
- `idx_events_type`
- `idx_events_created_at`

## Design Notes

- keep schema boring and explicit
- prefer append-only events for observability
- avoid premature polymorphic magic
- use SQLite in WAL mode
- migrate with plain SQL files, not heavy ORM-first abstraction
