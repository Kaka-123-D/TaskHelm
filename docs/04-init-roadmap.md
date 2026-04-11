# TaskHelm Init Roadmap

## Goal of the Init Phase

The init phase should produce a usable project skeleton and validate the core loop:

- create project
- create task
- create branch and worktree
- write task capsule
- dispatch agent jobs
- track runtime state
- move task through review gates
- show everything in CLI and dashboard

## Phase 0: Project Skeleton

Deliverables:

- repo structure
- CLI app scaffold
- web dashboard scaffold
- SQLite schema
- local supervisor process
- common project model
- common task model

## Phase 1: Project Registry and Task Capsules

Deliverables:

- project creation flow
- project YAML schema
- project list view
- project detail shell
- task creation flow
- task YAML schema
- task capsule generator
- project task board and task detail views
- runtime tables for task and event state

## Phase 2: Worktree and Branch Manager

Deliverables:

- branch naming policy
- worktree creation and cleanup
- task-to-worktree binding
- path registry
- lock protection against duplicate claims

## Phase 3: Agent Run Orchestration

Deliverables:

- implementer run
- spec reviewer run
- code reviewer run
- runtime verifier run
- status transitions
- blocker handling

## Phase 4: Dev Server Pool

Deliverables:

- port allocator
- process start and stop
- health checks
- max active server policy
- warm and sleep states

## Phase 5: Eventing and Notifications

Deliverables:

- local notification support
- in-dashboard activity feed
- event subscriptions in supervisor
- finish and blocker alerts

## Phase 6: SpecDown Companion

Deliverables:

- optional project binding to SpecDown
- pull project context from SpecDown CLI or MCP
- push task artifacts to SpecDown
- task-level links back to SpecDown docs

## MVP Definition

An MVP is reached when a user can:

1. create or import a project
2. create or import a task inside that project
3. assign it a branch and worktree
4. launch at least one agent run
5. see runtime state change without manual polling
6. move the task through all review stages
7. inspect the project and task from either CLI or web dashboard

## Suggested Technical Shape

- frontend: Next.js
- backend runtime: local Node.js service
- state DB: SQLite
- CLI: TypeScript
- process control: OS child process management
- task memory: Markdown and YAML on disk

## Open-Source Strategy

Ship the local-first core first.

Do not wait for perfect SpecDown integration before opening the repo.

The open-source project should be useful on day one, then become more compelling when SpecDown integration lands.
