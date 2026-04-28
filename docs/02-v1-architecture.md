# TaskHelm V1 Architecture

> **Note (v0.1.12+):** This document predates the removal of the AI-agent dispatch + 3-gate review pipeline. Sections referencing `agent_runs`, `review_gates`, `current_agent_run_id`, `runOneCycle`, the dispatcher, the scheduler, the supervisor event loop, or the `agent` CLI group no longer reflect the codebase. The rest of the doc — projects, tasks, worktrees, dev-pool, capsules — is still accurate.


## System Shape

TaskHelm v1 uses a hybrid architecture:

- Markdown and YAML for human-facing task memory
- SQLite for runtime state and orchestration
- a local supervisor for event-driven automation
- CLI and web dashboard as equal interfaces
- projects as the top-level runtime boundary

## Core Layers

### 1. Project and Task Memory Layer

Each project owns many task capsules on disk:

```text
projects/<project-slug>/
  project.yaml
  overview.md
  policies.md
  tasks/
    <task-id>/
      task.yaml
      context.md
      plan.md
      handoff.md
      review.md
      artifacts/
```

Purpose:

- readable by humans
- readable by AI
- versionable in Git
- clean separation between projects and tasks

### 2. Runtime State Layer

SQLite stores dynamic operational state:

- projects
- tasks
- worktrees
- branches
- agents
- runs
- review jobs
- ports
- dev servers
- notifications
- locks
- event log

Purpose:

- fast queries
- durable state across sessions
- safe concurrency
- reliable event handling

### 3. Supervisor Layer

A local daemon or supervisor loop drives orchestration:

- watches runtime state
- dispatches agents
- reacts to completion events
- updates runtime state
- emits notifications

This layer solves the main failure mode of chat-only control:

- the manager should not need a user prompt to notice that a sub-agent finished

### 4. Workspace Runtime Layer

This layer manages local execution resources:

- branch creation
- worktree allocation
- port allocation
- dev server lifecycle
- pooled concurrency policy
- health checks

### 5. Interface Layer

Two first-class interfaces:

- CLI for direct control, automation, scripts, power users
- web dashboard for project list, board view, monitoring, and decision-making

## Hero Screen

The primary web screen is a Project List.

Clicking a project opens a Project Task Board.

Each task row or card should show:

- task priority
- branch
- worktree path
- port
- dev server state
- active agent count
- latest review state
- latest blocker or update
- project-local ops snapshot

## Review Pipeline

Every task may pass through 3 review gates:

1. spec compliance
2. code quality and risk review
3. runtime verification or smoke gate

These are explicit runtime jobs, not implicit chat habits.

## Dev Server Pooling

TaskHelm should not keep every task hot all the time.

The runtime layer should support:

- max concurrent dev servers
- warm vs sleeping tasks
- on-demand wake
- automatic stop for idle worktrees

## Why Hybrid, Not Markdown-Only

Markdown is excellent for context and decision history.

Markdown alone is weak for:

- task claiming
- eventing
- process tracking
- resource locking
- reactive notifications

SQLite complements Markdown without replacing it.

## Why Single-User First

Single-user first keeps the product sharp:

- fewer auth concerns
- simpler runtime ownership
- faster OSS adoption
- cleaner orchestration model

Multi-user can be layered later on top of the same core concepts.

## Why Projects Matter

Projects are not cosmetic grouping.

They define:

- repo root
- git policy
- branch naming policy
- worktree root
- dev server policy
- task namespace
- review defaults
