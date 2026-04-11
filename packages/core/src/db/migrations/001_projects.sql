CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  local_repo_root TEXT NOT NULL,
  default_branch TEXT,
  branch_naming_pattern TEXT,
  worktree_root TEXT,
  dev_command TEXT,
  install_command TEXT,
  test_command TEXT,
  max_active_dev_servers INTEGER NOT NULL DEFAULT 1,
  specdown_mode TEXT NOT NULL DEFAULT 'disabled',
  specdown_project_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
