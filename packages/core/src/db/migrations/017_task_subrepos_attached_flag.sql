-- Migration 017: track whether a task_subrepos row's worktree was created by
-- TaskHelm (`created_by_taskhelm = 1`) or pre-existed on disk and was attached
-- without going through `git worktree add` (`created_by_taskhelm = 0`).
--
-- Why: workspace cleanup must NOT destroy worktrees the user already had
-- before TaskHelm got involved. Without this flag, cleanup would call
-- `git worktree remove` on attached-but-not-created paths and delete the
-- user's pre-existing checkout — silent data loss.
--
-- Default 1 preserves the existing behavior for any rows written before
-- this column existed (those rows came from POST init, which always
-- materialized the worktree itself).

ALTER TABLE task_subrepos ADD COLUMN created_by_taskhelm INTEGER NOT NULL DEFAULT 1;
