# TaskHelm

Autonomous AI engineering manager for solo operators.

TaskHelm is a local control plane for parallel software execution — managing projects, tasks, branches, worktrees, agents, review pipelines, and dev servers from a single interface.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/taskhelm.git
cd taskhelm
pnpm install
pnpm run build

# Create a project
taskhelm project create --name "My App" --slug my-app --repo /path/to/repo

# Create a task
taskhelm task create --project my-app --title "Add auth" --goal "Implement JWT auth"

# Start the task (creates branch + worktree)
taskhelm task start <task-id>

# View task status
taskhelm task show <task-id>

# Start the web dashboard
pnpm --filter @taskhelm/web run dev
```

## What It Does

- **Projects & Tasks** — create projects, break work into tasks with full lifecycle tracking
- **Workspace Isolation** — each task gets its own branch, worktree, and allocated port
- **Agent Orchestration** — dispatch implementer and reviewer agents per task phase
- **Review Pipeline** — 3-gate review: spec compliance, code quality, runtime verification
- **Dev Server Pool** — manage pooled dev servers with max concurrency and health checks
- **Supervisor Daemon** — event-driven loop that advances task phases, dispatches agents, emits notifications
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
| `@taskhelm/supervisor` | Supervisor loop, phase machine, scheduler, dispatcher, notifications |
| `@taskhelm/cli` | CLI commands (project, task, workspace, dev, agent, specdown) |
| `@taskhelm/web` | Next.js dashboard with real-time SSE updates |

## Task Lifecycle

```
draft → ready → running → reviewing → done
                  ↓                     ↑
               blocked ────────────────┘
```

**Phases within `running`:**

context → planning → implementation → spec_review → code_review → runtime_verification → final_summary

## V1 Autonomy Boundary

**Allowed:** create branch/worktree, dispatch agents, edit code, run local dev/test commands, run review pipeline, update task artifacts.

**Not allowed by default:** push branches, merge, create PR/MR, mutate external ticket systems.

## SpecDown Integration

TaskHelm works standalone but integrates optionally with [SpecDown](https://specdown.app):

```bash
taskhelm specdown link my-project
taskhelm specdown pull-context my-project
taskhelm specdown push-task <task-id> --artifact review.md
```

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

## License

[MIT](./LICENSE)
