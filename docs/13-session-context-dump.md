# TaskHelm Session Context Dump

## Purpose

This file is the handoff for future sessions started from `~/Documents/TaskHelm`.

It summarizes the product context that was established during the original brainstorming session so a new session does not need the original chat history.

## Product Name

- Working title: `TaskHelm`

Reason:

- strong brand feel
- still understandable
- fits manager, control, and execution themes

## Product Positioning

TaskHelm is:

- 50% AI engineering manager
- 50% solo CTO cockpit

It is for one operator managing many active software tasks with agent help.

## Product Scope

TaskHelm must support:

- multiple projects at once
- multiple tasks inside each project
- one project list
- click into one project
- then see a project task board

This was added after the first draft of docs and is now part of the intended core model.

## V1 Shape

- single-user first
- CLI + web dashboard are equal first-class surfaces
- autonomous manager mode
- project-aware
- task-centric inside a project
- review pipeline with 3 gates
- managed and pooled dev servers
- dashboard-first reporting, with local notifications

## Autonomy Boundary

V1 may autonomously:

- create branch and worktree
- manage local task runtime
- dispatch implementer and reviewer agents
- edit code
- update docs and runtime state
- run local checks and verification commands

V1 should not autonomously:

- push
- merge
- create PR or MR
- write to ticket systems by default

## Why Hybrid State

The user explicitly questioned why runtime state should not live only in Markdown.

Final conclusion:

- Markdown or YAML is best for human-readable context and handoff
- SQLite is needed for runtime state, eventing, locking, ports, PIDs, and proactive reporting

This hybrid model is now the intended architecture.

## Local-First Context

Important nuance:

- no external service should be a hard dependency for OSS adoption
- TaskHelm must remain useful as a standalone local control plane

## Why Not Use External Frameworks as Core

The user wants the system to be custom-built and open-source, not based on a GitHub orchestration framework as the core.

Reason:

- tighter control
- clearer OSS identity
- simpler local-first product story

External systems may still inform design, but the core should be self-authored.

## Main Product Thesis

TaskHelm is not just:

- a task tracker
- an agent wrapper
- a worktree helper

It is a local execution control plane for software work.

## Core Navigation Model

1. Project List
2. Project Detail
3. Project Task Board
4. Task Detail Cockpit

## Hero UX

The web app should center on a Project List.

Each project then opens into a task board with ops-rich task rows.

Each task row should show:

- branch
- worktree
- port
- dev server state
- active agent count
- latest blocker
- review state

## Open Questions for Future Sessions

These have not been fully specified yet:

- repo structure for implementation
- choice of frontend/backend packaging for the app itself
- exact SQLite migration strategy
- exact supervisor runtime model
- exact format for agent adapters
- exact notification channel implementation

## Recommended Next Steps

When starting the next session:

1. read `README.md`
2. read this file
3. read:
   - `02-v1-architecture.md`
   - `06-domain-model.md`
   - `07-sqlite-schema.md`
   - `09-supervisor-event-model.md`
4. decide whether to:
   - refine specs more
   - scaffold the actual repo

## Session Outcome Summary

This session produced:

- project name
- product positioning
- project-aware model
- initial architecture docs
- technical specs for v1
- explicit local-first context strategy

This is the intended baseline for the next session.
