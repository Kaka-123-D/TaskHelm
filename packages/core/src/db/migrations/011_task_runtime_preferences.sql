ALTER TABLE tasks ADD COLUMN workspace_name TEXT;
ALTER TABLE tasks ADD COLUMN workspace_branch TEXT;
ALTER TABLE tasks ADD COLUMN workspace_subrepo_branches_json TEXT;
ALTER TABLE tasks ADD COLUMN preferred_port INTEGER;
