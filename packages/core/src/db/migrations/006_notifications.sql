CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  project_id TEXT,
  level TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
