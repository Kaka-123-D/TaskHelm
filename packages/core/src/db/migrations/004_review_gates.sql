CREATE TABLE IF NOT EXISTS review_gates (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  gate_type TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  notes_ref TEXT,
  opened_at TEXT,
  closed_at TEXT,
  UNIQUE(task_id, gate_type)
);
