# TaskHelm

Autonomous AI engineering manager for solo operators.

TaskHelm is a local control plane for parallel software execution — managing projects, tasks, branches, worktrees, agents, review pipelines, and dev servers from a single interface.

## Quick Start

```bash
# App launcher
npm i -g taskhelm
taskhelm

# CLI
npm i -g @taskhelm/cli
taskhelm project list
```

`taskhelm` is the launcher package. It starts the local web app on `http://127.0.0.1:4100`, downloading a version-matched runtime bundle on first launch when needed.

`@taskhelm/cli` is the CLI-only package. It does not auto-open the web app.

## What It Does

- **Projects & Tasks** — create projects, break work into local-first tasks with saved context and runtime metadata
- **Workspace Isolation** — each task gets its own branch, worktree, and allocated port
- **Agent Orchestration** — dispatch implementer and reviewer agents as explicit runs attached to a task
- **Review Pipeline** — 3-gate review: spec compliance, code quality, runtime verification
- **Dev Server Pool** — manage pooled dev servers with max concurrency and health checks
- **Supervisor Daemon** — event-driven loop that watches runs, recovers runtime state, and emits notifications
- **Dual Interface** — CLI and web dashboard are equal first-class surfaces

## Architecture

```
┌─────────┐  ┌───────────┐
│   CLI   │  │ Dashboard  │
└────┬────┘  └─────┬─────┘
     │             │
     └──────┬──────┘
            │
     ┌──────┴──────┐
     │  Supervisor  │  ← event loop, scheduler, dispatcher
     ├──────────────┤
     │  SQLite DB   │  ← runtime state (WAL mode)
     ├──────────────┤
     │  Disk Capsules│  ← Markdown/YAML task memory
     └──────────────┘
```

**Packages:**

| Package | Description |
|---------|-------------|
| `@taskhelm/core` | Domain model, SQLite repositories, workspace utilities, capsule I/O |
| `@taskhelm/supervisor` | Supervisor loop, dispatcher, dev-pool, recovery, notifications |
| `@taskhelm/cli` | CLI-only commands (project, task, workspace, dev, agent) |
| `@taskhelm/web` | Next.js dashboard with real-time SSE updates |

## Manual Publish

Publish order:

```bash
pnpm install
pnpm run build

pnpm --filter @taskhelm/core publish --access public
pnpm --filter @taskhelm/supervisor publish --access public
pnpm --filter @taskhelm/cli publish --access public
pnpm publish --access public
```

Before publishing `taskhelm`, host the web runtime manifest and runtime bundle at the default launcher URL shape:

```text
https://releases.taskhelm.dev/runtime/{version}/manifest.json
```

The manifest should point to the versioned runtime `.tgz` built from `packages/web/runtime`.

## V1 Autonomy Boundary

**Allowed:** create branch/worktree, dispatch agents, edit code, run local dev/test commands, run review pipeline, update task artifacts.

**Not allowed by default:** push branches, merge, create PR/MR, mutate external ticket systems.

## Development

```bash
pnpm run typecheck   # Typecheck all packages
pnpm run test        # Run all tests
pnpm run build       # Build all packages
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full development guide.

## Document Map

- [Product Vision](./docs/01-product-vision.md)
- [V1 Architecture](./docs/02-v1-architecture.md)
- [Init Roadmap](./docs/04-init-roadmap.md)
- [Decision Log](./docs/05-decision-log.md)
- [Domain Model](./docs/06-domain-model.md)
- [SQLite Schema](./docs/07-sqlite-schema.md)
- [Task Capsule Spec](./docs/08-task-capsule-spec.md)
- [Supervisor and Event Model](./docs/09-supervisor-event-model.md)
- [CLI Spec](./docs/10-cli-spec.md)
- [Web Dashboard Spec](./docs/11-web-dashboard-spec.md)
- [Session Context Dump](./docs/13-session-context-dump.md)

## License

[MIT](./LICENSE)
