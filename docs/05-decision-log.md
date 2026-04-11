# TaskHelm Decision Log

## Working Title

- Chosen working title: `TaskHelm`

## Product Positioning

- 50% AI engineering manager
- 50% solo CTO cockpit

## V1 Interface

- CLI and web dashboard are equal first-class interfaces

## User Model

- single-user first

## Core Managed Units

- project > task
- projects are top-level containers
- tasks are the operational units inside projects

## SpecDown Relationship

- standalone by default
- best experience with SpecDown as companion

## Autonomy Boundary for V1

Allowed:

- create branch and worktree
- dispatch agents
- edit code
- run local dev and test commands
- run review pipeline
- update local task artifacts

Not allowed by default:

- push branches
- merge
- create PR or MR
- mutate ticket systems

## Runtime State Strategy

- hybrid model
- Markdown and YAML for human-facing task memory
- SQLite for runtime state

## Hero Screen

- Project List
- each project opens into a Project Task Board
- every task shows ops snapshot

## Review Pipeline

- spec compliance
- code quality and risk
- runtime verification or smoke gate

## Dev Server Management

- managed and pooled

## Notification Model

- dashboard as primary source of truth
- local notifications for timely awareness
- chat connectors as optional add-ons
