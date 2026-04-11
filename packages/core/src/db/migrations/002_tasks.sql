CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  key TEXT,
  title TEXT NOT NULL,
  goal TEXT,
  source_type TEXT,
  source_ref TEXT,
  status TEXT NOT NULL,
  phase TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  branch_name TEXT,
  worktree_path TEXT,
  port INTEGER,
  dev_server_state TEXT,
  current_agent_run_id TEXT,
  latest_blocker TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase);
