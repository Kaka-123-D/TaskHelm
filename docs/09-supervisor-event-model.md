# TaskHelm Supervisor and Event Model

## Problem to Solve

Chat-native control fails when the manager only checks worker status after another user turn.

TaskHelm needs a local runtime that can react continuously.

## Supervisor Responsibilities

- poll or subscribe to agent statuses
- dispatch next jobs
- maintain task phase transitions
- enforce review ordering
- manage dev-server pool
- emit notifications
- materialize updated handoff summaries

## Main Loop

Pseudo-flow:

1. load due tasks
2. inspect active locks and running jobs
3. consume new events
4. update task state
5. schedule next jobs
6. emit notifications
7. refresh dashboard cache

## Event Sources

- CLI actions
- web dashboard actions
- agent completion callbacks
- process health changes
- dev-server lifecycle events
- timer-based checks

## Important Event Types

- `project.created`
- `task.created`
- `task.imported`
- `task.phase.changed`
- `task.blocked`
- `agent.run.started`
- `agent.run.completed`
- `agent.run.failed`
- `review.opened`
- `review.passed`
- `review.failed`
- `dev_server.started`
- `dev_server.stopped`
- `dev_server.failed`
- `notification.requested`
- `notification.delivered`

## Scheduling Policy

The scheduler should be deterministic by default.

It should not rely on LLM judgment for:

- whether the next review gate opens
- whether a sleeping dev server should be stopped
- whether a task can move from implementation to spec review

LLMs may produce content and judgments inside jobs.
The supervisor should own workflow transitions.

## Locks

Use local logical locks for:

- task dispatch
- worktree creation
- port allocation
- review gate execution

## Failure Recovery

On restart, supervisor should:

- reload running tasks from SQLite
- inspect live PIDs
- mark dead processes as failed or stopped
- resume pending notifications
- recompute schedulable jobs

## Notification Strategy

Primary notification targets:

- dashboard activity feed
- local desktop notification

Optional later connectors:

- Slack
- Telegram
- Discord
