-- Removes the AI-agent dispatch + 3-gate review pipeline tables.
-- TaskHelm now focuses solely on visual coordination of parallel
-- git-worktree tasks; agent execution and review pipelines are out of scope.

DROP TABLE IF EXISTS review_gates;
DROP TABLE IF EXISTS agent_runs;

-- The current_agent_run_id pointer on tasks no longer references anything.
ALTER TABLE tasks DROP COLUMN current_agent_run_id;
