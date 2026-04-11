CREATE TABLE IF NOT EXISTS locks (
  key TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL
);
