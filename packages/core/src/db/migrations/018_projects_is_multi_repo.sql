-- Migration 018: opt-in multi-repo project flag.
-- When 1, the project's tasks are expected to manage N nested-repo
-- worktrees per task (rooted under `.worktrees/<task-key>/<subrepo>/`)
-- instead of a single outer worktree. The dashboard renders a different
-- task-detail layout for these projects: outer DevServerPanel is hidden
-- in favor of SubreposPanel, and WorkspacePanel collapses to a summary.
--
-- Default 0 preserves every existing project's behavior exactly.

ALTER TABLE projects ADD COLUMN is_multi_repo INTEGER NOT NULL DEFAULT 0;
