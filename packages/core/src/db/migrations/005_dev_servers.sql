CREATE TABLE IF NOT EXISTS dev_servers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT,
  port INTEGER NOT NULL UNIQUE,
  pid INTEGER,
  status TEXT NOT NULL,
  health_url TEXT,
  started_at TEXT,
  stopped_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_dev_servers_project_id ON dev_servers(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_servers_status ON dev_servers(status);
