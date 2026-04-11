# TaskHelm

TaskHelm is an autonomous AI engineering manager for solo operators.

It is designed for the real workflow of one technical person running many projects and many tasks in parallel:

- one project
- many tasks
- one branch
- one worktree
- one or more agents
- one review pipeline
- one ops snapshot

TaskHelm is not just a task tracker and not just an agent wrapper.
It is a local control plane for parallel software execution:

- create and manage projects
- create and manage task workspaces
- orchestrate implementer and reviewer agents
- track runtime state and progress
- manage pooled dev servers
- keep human-readable context in Markdown

TaskHelm is designed to work standalone, but work best with [SpecDown](https://specdown.app).

## Positioning

TaskHelm sits at the intersection of:

- AI engineering manager
- solo CTO cockpit
- project-aware task execution control plane

The primary user is a single technical operator who wants manager-grade leverage without building a whole team first.

## Product Principles

- Task-centric over chat-centric
- Runtime state must survive session loss
- Markdown remains first-class for human context
- The system should proactively report, not wait for manual polling
- Work standalone; become better with SpecDown
- CLI and web dashboard are equal citizens
- Projects are the top-level operational boundary

## V1 Boundary

TaskHelm v1 is single-user first.

It may autonomously:

- create branch and worktree
- manage local runtime for a task
- dispatch implementer and reviewer agents
- update task docs and runtime state
- run local dev/test/smoke commands

It will not autonomously:

- push remote branches
- merge code
- create PRs or MRs
- mutate external ticket systems by default

## Document Map

- [Product Vision](./docs/01-product-vision.md)
- [V1 Architecture](./docs/02-v1-architecture.md)
- [SpecDown Companion Strategy](./docs/03-specdown-companion.md)
- [Init Roadmap](./docs/04-init-roadmap.md)
- [Decision Log](./docs/05-decision-log.md)
- [Domain Model](./docs/06-domain-model.md)
- [SQLite Schema](./docs/07-sqlite-schema.md)
- [Task Capsule Spec](./docs/08-task-capsule-spec.md)
- [Supervisor and Event Model](./docs/09-supervisor-event-model.md)
- [CLI Spec](./docs/10-cli-spec.md)
- [Web Dashboard Spec](./docs/11-web-dashboard-spec.md)
- [SpecDown Technical Integration](./docs/12-specdown-integration-tech-spec.md)
- [Session Context Dump](./docs/13-session-context-dump.md)

## Working Thesis

If coding agents are workers, TaskHelm is the manager.

If worktrees are the factory floor, TaskHelm is the control tower.

If tasks are the work units, projects are the command zones.
