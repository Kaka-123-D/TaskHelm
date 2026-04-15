# TaskHelm Web Dashboard Spec

## Primary Navigation

V1 navigation:

1. Project List
2. Project Detail
3. Project Task Board
4. Task Detail Cockpit

## Screen 1: Project List

Purpose:

- show every managed project
- surface high-level health
- enter a project's task board

Each project card or row should show:

- project name
- local repo root
- task count
- attached workspace count
- active dev server count
- latest critical notification

## Screen 2: Project Task Board

Purpose:

- operational center for one project
- view and manage all project tasks

Each task card or row should show:

- task id and title
- priority
- branch
- worktree path
- port
- dev server state
- active agent count
- latest review gate state
- latest blocker

## Screen 3: Task Detail Cockpit

Purpose:

- deep operational view for one task

Sections:

- task summary
- source ticket info
- current branch and worktree
- live agent runs
- review pipeline
- recent events
- capsule document links
- dev server controls

## Global Surfaces

- activity feed
- notifications center
- runtime health strip

## UX Priorities

- operator should scan many tasks quickly
- every important ops signal must be visible without opening logs
- workspace/runtime actions must feel explicit and trustworthy
