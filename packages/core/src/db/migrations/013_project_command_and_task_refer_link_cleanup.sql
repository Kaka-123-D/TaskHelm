PRAGMA foreign_keys = OFF;

CREATE TABLE projects_new (
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
  max_active_dev_servers INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO projects_new (
  id,
  slug,
  name,
  description,
  local_repo_root,
  default_branch,
  branch_naming_pattern,
  worktree_root,
  dev_command,
  install_command,
  max_active_dev_servers,
  created_at,
  updated_at
)
SELECT
  id,
  slug,
  name,
  description,
  local_repo_root,
  default_branch,
  branch_naming_pattern,
  worktree_root,
  dev_command,
  install_command,
  max_active_dev_servers,
  created_at,
  updated_at
FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key TEXT,
  title TEXT NOT NULL,
  goal TEXT,
  refer_link TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  branch_name TEXT,
  worktree_path TEXT,
  port INTEGER,
  dev_server_state TEXT,
  context_vault_root_path TEXT,
  context_vault_sources_json TEXT,
  context_vault_files_json TEXT,
  context_vault_selected_file TEXT,
  current_agent_run_id TEXT,
  latest_blocker TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  workspace_name TEXT,
  workspace_branch TEXT,
  workspace_subrepo_branches_json TEXT,
  preferred_port INTEGER
);

INSERT INTO tasks_new (
  id,
  project_id,
  key,
  title,
  goal,
  refer_link,
  priority,
  branch_name,
  worktree_path,
  port,
  dev_server_state,
  context_vault_root_path,
  context_vault_sources_json,
  context_vault_files_json,
  context_vault_selected_file,
  current_agent_run_id,
  latest_blocker,
  created_at,
  updated_at,
  workspace_name,
  workspace_branch,
  workspace_subrepo_branches_json,
  preferred_port
)
SELECT
  id,
  project_id,
  key,
  title,
  goal,
  NULL,
  priority,
  branch_name,
  worktree_path,
  port,
  dev_server_state,
  context_vault_root_path,
  context_vault_sources_json,
  context_vault_files_json,
  context_vault_selected_file,
  current_agent_run_id,
  latest_blocker,
  created_at,
  updated_at,
  workspace_name,
  workspace_branch,
  workspace_subrepo_branches_json,
  preferred_port
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

PRAGMA foreign_keys = ON;
