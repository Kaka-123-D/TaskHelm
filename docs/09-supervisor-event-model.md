# TaskHelm Supervisor and Event Model

## Problem to Solve

Chat-native control fails when the manager only checks worker status after another user turn.

TaskHelm needs a local runtime that can react continuously.

## Supervisor Responsibilities

- poll or subscribe to agent statuses
- dispatch next jobs
- manage dev-server pool
- emit notifications
- materialize updated handoff summaries

## Main Loop

Pseudo-flow:

1. load due tasks
2. inspect active locks and running jobs
3. consume new events
4. update task runtime metadata
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
- `task.agent_run.completed`
- `task.agent_run.failed`
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

## Locks

Use local logical locks for:

- task dispatch
- worktree creation
- port allocation
- review gate execution

## Failure Recovery

On restart, supervisor should:

- reload active tasks from SQLite
- inspect live PIDs
- mark dead processes as failed or stopped
- resume pending notifications
- reconcile interrupted agent runs

## Notification Strategy

Primary notification targets:

- dashboard activity feed
- local desktop notification

Optional later connectors:

- Slack
- Telegram
- Discord
