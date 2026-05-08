# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskHelm is a local-first visual workbench for parallel git-worktree work. It manages projects, tasks, branches, worktrees, ports, and a pooled set of dev servers from one dashboard — replacing the usual `git worktree` + `lsof` + four-terminals workflow with a UI. It ships as two npm binaries:

- `taskhelm` — launcher that boots the local web dashboard on `http://127.0.0.1:4100` (default). On first run it prepares a Next.js standalone runtime under `~/.taskhelm/runtime/<version>` from assets shipped inside the npm tarball (see `scripts/prepare-installed-runtime.mjs`).
- `taskhelm-cli` — CLI-only entrypoint. Same Commander program, but does not auto-launch the dashboard (see `packages/cli/src/launcher/argv.ts` and `bin/taskhelm.js`).

State lives in **SQLite** at `~/.taskhelm/taskhelm.db` (override with `TASKHELM_DB`) — runtime state, WAL mode, migrations applied on every `getDb()` call. The legacy Markdown/YAML "task capsule" feature was removed in v0.1.17; nothing is written into the user's project repo any more.

## Workspace Layout

pnpm workspace + Turborepo, four packages:

| Package | Role |
|---------|------|
| `@taskhelm/core` | Domain model, SQLite repos, migrations, workspace utilities (branch/worktree/port). All other packages depend on this. |
| `@taskhelm/supervisor` | Dev-server pool (`startDevServer` / `stopDevServer` / `getPoolStatus`) and crash-recovery helpers (`recoverOnStartup`). |
| `@taskhelm/cli` | Commander CLI (`project`, `task`, `workspace`, `dev` groups) plus the launcher (`launcher/`) that prepares and starts the web runtime. |
| `@taskhelm/web` | Next.js 15 App Router dashboard (React 19, Tailwind v4). Reads/writes the same SQLite via `@taskhelm/core`. |

Build dependency order is enforced by Turbo (`^build`). The root `pnpm run build` calls `scripts/build-workspaces.mjs`, which runs `pnpm run build` in each package sequentially in this order: **core → supervisor → cli → web**. It strips `npm_*`/`PNPM_*`/`INIT_CWD` env vars before each subprocess to prevent pnpm-script env leakage; preserve that behavior.

## Common Commands

```bash
# All packages (Turborepo)
pnpm run typecheck            # tsc --noEmit across all packages
pnpm run test                 # Vitest (run mode) across all packages
pnpm run build                # Custom orchestrator, NOT `turbo build`
pnpm run dev                  # Per-package dev (web: next dev on :4100)

# Single package
pnpm --filter @taskhelm/core run test
pnpm --filter @taskhelm/web run typecheck
pnpm --filter @taskhelm/web run dev          # Next dev server on :4100
pnpm --filter @taskhelm/web run test:e2e     # Playwright (web only)

# Single test file (Vitest)
pnpm --filter @taskhelm/core exec vitest run path/to/file.test.ts
pnpm --filter @taskhelm/core exec vitest path/to/file.test.ts -t "test name"
```

There is no `lint` step wired up (`turbo.json` defines the task but no package implements it). Do not add one without the user's say-so.

## Tech Stack & Conventions That Aren't Obvious

- **Node engine:** `>=22.14.0` (declared in root `package.json`). CI runs on Node 20 and 22.
- **TypeScript:** strict mode, ESM (`"type": "module"`), `moduleResolution: "bundler"` (root `tsconfig.base.json`). Imports use **explicit `.js` extensions** for relative paths even in `.ts` source — required by the bundler resolver and the runtime's ESM loader. Do not strip them.
- **SQLite:** `better-sqlite3`, marked as `serverExternalPackages` in `next.config.mjs` so Next does not bundle it. The webpack config also suppresses a known "Critical dependency" warning for it; keep both.
- **Test runner:** Vitest in every package. Tests are colocated as `*.test.ts(x)` next to source in CLI/web/supervisor and under `tests/` mirrors of `src/` in core. Follow the existing convention per package.
- **E2E:** Playwright, **web package only** (`@playwright/test`), via `pnpm --filter @taskhelm/web run test:e2e`.
- **Web build is non-standard:** `pnpm --filter @taskhelm/web run build` runs `clean-runtime.mjs → next build → package-runtime.mjs`. The package step rewrites symlinks inside `.next/standalone`, materializes `node_modules` for `@taskhelm/*`, `better-sqlite3`, and `sharp`, copies static assets to three locations, and produces `packages/web/runtime/` plus a `taskhelm-web-runtime-<version>.tgz` bundle. Do not replace this pipeline with a plain `next build` — the published `taskhelm` package depends on the runtime layout it produces.
- **Web is `output: 'standalone'`** with `outputFileTracingRoot` set to the repo root so Next traces workspace dependencies correctly.
- **Layout pre-fetches DB on every render:** `packages/web/src/app/layout.tsx` is `force-dynamic` and runs migrations + reads projects synchronously. Any change that makes layout async or non-dynamic will break the sidebar.
- **Default port:** 4100. Override via `TASKHELM_PORT` or `PORT` (`packages/cli/src/launcher/index.ts:11`). Invalid values silently fall back to 4100.

## Domain Model (one-page summary)

- `Project` — top-level boundary (repo root, slug, policies). Migrations 001, 013.
- `Task` — primary unit attached to a project; owns a branch, worktree path, allocated port, and a context-vault. Migrations 002, 011, 012, 013, 014. **Note:** `status` and `phase` columns were removed in migration 012; the AI-agent dispatch + 3-gate review pipeline tables (`agent_runs`, `review_gates`) and the `current_agent_run_id` task column were dropped in migration 014.
- `dev_servers` — pooled, max-concurrency, warm vs sleeping (`packages/supervisor/src/dev-pool.ts`).
- `events`, `notifications`, `locks` — generic coordination tables. Currently dormant after the agent-feature removal; kept as forward-compatible infra.
- Migrations live at `packages/core/src/db/migrations/NNN_*.sql` and are applied in numeric order by `runMigrations`. Add new ones with the next sequence number; never edit applied ones.

## Autonomy Boundary

**Allowed:** create branch/worktree, allocate ports, start/stop dev servers, edit code in worktrees, run local dev/test commands, update task records in the SQLite DB.

**Not allowed by default:** push branches, merge, create PR/MR, mutate external ticket systems.

## Project-Scoped Agent Rules

`AGENTS.md` adds two project rules on top of the global ones:

- **`ui-ux-priority`** — UI/UX work must go through the `ui-ux-pro-max` plugin first; do not hand-write components without consulting it.
- **`post-turn-review`** — after each turn that produces code changes, run the code-review agent/skill on the changed files and fix CRITICAL/HIGH issues before moving on.
- **Disabled MCPs in this project (`AGENTS.md`):** do not call `pencil`, `supabase`, or `magic` MCP tools.

## Document Map

Read in this order for full design context (everything under `docs/` is the v1 spec):

- `docs/13-session-context-dump.md` — quickstart handoff
- `docs/02-v1-architecture.md` — system layers
- `docs/06-domain-model.md` — entities and state machines (note: spec predates migrations 012 and 014)
- `docs/07-sqlite-schema.md` — runtime tables (note: spec predates migrations 012 and 014)
- `docs/08-task-capsule-spec.md` — DEPRECATED, the capsule feature was removed in v0.1.17
- `docs/10-cli-spec.md` — CLI command groups (note: spec predates removal of the `agent` group)
- `docs/11-web-dashboard-spec.md` — dashboard screens
- `docs/04-init-roadmap.md` — phased implementation plan

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **TaskHelm** (1496 symbols, 2845 relationships, 114 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
