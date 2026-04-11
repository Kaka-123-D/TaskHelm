# TaskHelm Task Capsule Spec

## Goal

A task capsule is the human-readable memory bundle for one task.

It must be:

- readable by humans
- readable by agents
- easy to diff in Git
- easy to sync to SpecDown

## Directory Structure

```text
projects/<project-slug>/tasks/<task-id>/
  task.yaml
  context.md
  plan.md
  handoff.md
  review.md
  artifacts/
```

## `task.yaml`

Minimal frontmatter-like state for the task.

Suggested fields:

```yaml
id: TH-123
project_slug: my-project
title: Fix creator search by category and hashtag
goal: Allow creator search from category and hashtag entry points
source:
  type: backlog
  ref: LRC-12424
status: running
phase: code_review
priority: 2
branch_name: feat/LRC-12424
worktree_path: /abs/path/.worktrees/feat-LRC-12424
port: 3003
specdown:
  mode: linked
  project_ref: my-specdown-project
  doc_refs: []
reviews:
  spec_compliance: passed
  code_quality: open
  runtime_verification: pending
updated_at: 2026-04-10T10:00:00Z
```

## `context.md`

Contains:

- source ticket summary
- screenshots or artifacts
- relevant code pointers
- confirmed scope
- out-of-scope notes
- assumptions

## `plan.md`

Contains:

- requirement breakdown
- implementation plan
- verification checklist
- open questions

## `handoff.md`

Contains:

- current status
- what changed
- blockers
- next recommended action
- commands or paths another agent needs

## `review.md`

Contains:

- findings by gate
- unresolved concerns
- final recommendation

## Update Rules

- supervisor updates runtime DB first
- relevant markdown artifact is then refreshed
- markdown should summarize state, not duplicate every event row

## Philosophy

The capsule is not a chat transcript.

It is structured operational memory.
