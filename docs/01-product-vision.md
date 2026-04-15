# TaskHelm Product Vision

## One-Line Pitch

TaskHelm is an autonomous AI engineering manager for solo builders who run many projects, tasks, branches, worktrees, and agents at once.

## Problem

Current AI coding workflows break down when work becomes parallel.

The pain is not only implementation quality. The real pain is coordination:

- context gets trapped inside chat sessions
- worktree state is not tracked centrally
- dev servers consume too much resource when scaled naively
- managers have to manually check whether agents finished
- review becomes inconsistent across tasks
- project boundaries become fuzzy when several repos are active at the same time
- human-readable plans and machine-readable runtime drift apart

For a solo operator, the result is cognitive overload.

The user becomes a brittle scheduler, reviewer, and memory layer for the whole system.

## Product Goal

TaskHelm should let one operator manage parallel software execution the way a strong engineering manager would:

- group work by project first
- turn goals into task capsules
- attach each task to branch and worktree
- dispatch the right agents
- move tasks through review gates
- manage scarce local resources
- proactively report status and blockers

## Core Experience

The user should be able to say:

“Open these 3 projects, keep their task boards separate, assign 5 active tasks to their own worktrees, keep only 2 dev servers warm, route each through implementer then 3 review gates, and alert me only on blockers or final approvals.”

TaskHelm should then do the coordination work continuously.

## Primary User

Single-user first:

- solo CTO
- staff engineer acting as manager-operator
- technical founder
- lead developer coordinating several active branches

## Non-Goals for V1

- full team collaboration as a first-class feature
- enterprise RBAC
- hosted multi-tenant orchestration
- fully autonomous push/merge/PR creation
- replacing Git or ticket systems

## V1 Success Criteria

TaskHelm v1 is successful if a single user can:

- keep multiple active projects separate without losing local context
- run multiple active tasks at once without losing context
- know branch, worktree, agent, review, and dev-server state from one place
- recover from interrupted sessions without manual reconstruction
- receive proactive reporting when sub-agents finish or block
- keep task context readable in Markdown and executable in runtime state

## Local-First Principle

TaskHelm should be open-source and independently useful from the local filesystem alone.

That means:

- standalone first-run must be easy
- task context must stay readable in local Markdown and YAML
- no external integration should be required for core orchestration

## Information Architecture Thesis

The primary navigation model should be:

1. Project List
2. Project Detail
3. Project Task Board
4. Task Detail Cockpit

TaskHelm should feel like a manager's multi-project command center, not a single flat queue of tasks.
