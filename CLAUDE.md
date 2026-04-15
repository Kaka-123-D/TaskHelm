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
- Local-first context is a core requirement — standalone must work on day one
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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **TaskHelm** (816 symbols, 1762 relationships, 61 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/TaskHelm/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/TaskHelm/context` | Codebase overview, check index freshness |
| `gitnexus://repo/TaskHelm/clusters` | All functional areas |
| `gitnexus://repo/TaskHelm/processes` | All execution flows |
| `gitnexus://repo/TaskHelm/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
