# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskHelm is an autonomous AI engineering manager for solo operators. It is a local control plane for parallel software execution — managing projects, tasks, branches, worktrees, agents, review pipelines, and dev servers from a single interface.

**Current state:** Design/specification phase only. No implementation code exists yet. The `docs/` directory contains 13 specification documents that define the product vision, architecture, domain model, and technical specs for v1.

## Intended Tech Stack (from docs/04-init-roadmap.md)

- **Frontend:** Next.js (web dashboard)
- **Backend:** Local Node.js service
- **CLI:** TypeScript
- **Database:** SQLite (WAL mode, plain SQL migrations — no heavy ORM)
- **Task memory:** Markdown + YAML on disk
- **Process control:** OS child process management

## Architecture (Hybrid Model)

TaskHelm uses two complementary storage layers:

1. **Markdown/YAML on disk** — human-readable task memory, versionable in Git
2. **SQLite** — runtime state (status, locks, PIDs, ports, events, agent lifecycle)

Five core layers:
- **Project & Task Memory** — disk-based capsule files per task
- **Runtime State** — SQLite tables (projects, tasks, agent_runs, review_gates, dev_servers, notifications, locks, events)
- **Supervisor** — local daemon that watches state, dispatches agents, transitions tasks, emits notifications
- **Workspace Runtime** — branch/worktree creation, port allocation, dev server lifecycle, pooling
- **Interface** — CLI and web dashboard as equal first-class surfaces

## Domain Model

- `Project` is the top-level boundary (repo root, policies, task namespace)
- `Task` is the primary execution unit (branch, worktree, port, agent runs, review gates)
- Task statuses: draft → ready → running → reviewing → blocked → done → archived
- Task phases: context → planning → implementation → spec_review → code_review → runtime_verification → final_summary
- Review pipeline: 3 gates (spec_compliance, code_quality, runtime_verification)

## Disk Layout for Task Capsules

```
projects/<project-slug>/
  project.yaml
  overview.md
  policies.md
  tasks/<task-id>/
    task.yaml      # minimal structured state
    context.md     # scope, assumptions, code pointers
    plan.md        # implementation plan, verification checklist
    handoff.md     # current status, blockers, next action
    review.md      # findings by gate, recommendation
    artifacts/
```

## V1 Autonomy Boundary

**Allowed:** create branch/worktree, dispatch agents, edit code, run local dev/test commands, run review pipeline, update task artifacts.

**Not allowed by default:** push branches, merge, create PR/MR, mutate external ticket systems.

## Key Design Decisions

- Single-user first (no auth/RBAC in v1)
- Dev servers are pooled with max concurrency — warm vs sleeping states
- Supervisor updates SQLite first, then refreshes markdown artifacts
- SpecDown integration is optional — standalone must work on day one
- CLI supports `--json` output for automation; table output by default

## Document Map

Read these in order for full context:
- `docs/13-session-context-dump.md` — quickstart handoff from brainstorming session
- `docs/02-v1-architecture.md` — system layers
- `docs/06-domain-model.md` — entities and state machines
- `docs/07-sqlite-schema.md` — all runtime tables
- `docs/09-supervisor-event-model.md` — event-driven automation
- `docs/10-cli-spec.md` — CLI command groups
- `docs/11-web-dashboard-spec.md` — dashboard screens
- `docs/04-init-roadmap.md` — phased implementation plan (Phase 0-6)
