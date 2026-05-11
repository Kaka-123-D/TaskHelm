-- Migration 016: multi-repo task support.
-- Adds task_subrepos as a child table of tasks. Each row represents one
-- nested repository (e.g. monorepo packages or multi-repo workspaces) with
-- its own branch / worktree / port / dev_command / dev_server_state.
--
-- Backward compat: tasks with no rows in this table behave exactly like
-- before (single-repo tasks keep using tasks.worktree_path,
-- tasks.preferred_port, tasks.dev_server_state).
--
-- dev_servers gains a nullable task_subrepo_id so the dev pool can key on
-- (task_id, task_subrepo_id) and run multiple servers per task.

CREATE TABLE IF NOT EXISTS task_subrepos (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  repo_path TEXT NOT NULL,
  branch_name TEXT,
  worktree_path TEXT,
  preferred_port INTEGER,
  dev_command TEXT,
  dev_server_state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(task_id, repo_path)
);

CREATE INDEX IF NOT EXISTS idx_task_subrepos_task_id ON task_subrepos(task_id);

ALTER TABLE dev_servers ADD COLUMN task_subrepo_id TEXT REFERENCES task_subrepos(id);

CREATE INDEX IF NOT EXISTS idx_dev_servers_task_subrepo_id ON dev_servers(task_subrepo_id);
