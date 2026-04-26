<div align="center">

# TaskHelm

**Local-first AI engineering manager for solo operators.**

Coordinate parallel work across projects, tasks, branches, worktrees, agents, review gates,
and pooled dev servers — from one workbench, on your machine.

[![npm version](https://img.shields.io/npm/v/taskhelm.svg?color=f5a623&label=taskhelm&style=flat-square)](https://www.npmjs.com/package/taskhelm)
[![npm downloads](https://img.shields.io/npm/dm/taskhelm.svg?color=f5a623&style=flat-square)](https://www.npmjs.com/package/taskhelm)
[![license](https://img.shields.io/github/license/Kaka-123-D/TaskHelm?color=2f6df6&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/taskhelm.svg?color=2f6df6&style=flat-square)](./package.json)
[![GitHub stars](https://img.shields.io/github/stars/Kaka-123-D/TaskHelm?style=flat-square&color=f5a623)](https://github.com/Kaka-123-D/TaskHelm/stargazers)

<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/demo-04-project-detail.png" alt="TaskHelm project workbench" width="900" />

</div>

---

## Why TaskHelm

AI coding assistants are great at *one* file, *one* branch, *one* task. The moment you try to run several
streams of work in parallel — five tickets, three repos, two review pipelines, a pooled dev server — the
coordination layer becomes a person. You.

**TaskHelm is that coordination layer.** It's the local control plane your editor doesn't have:

| Today, without TaskHelm | With TaskHelm |
|---|---|
| Context lives inside chat sessions and dies with them | Each task owns a Markdown/YAML capsule on disk that survives crashes, restarts, and context resets |
| Worktree state is in your head | Branch, worktree, port, dev server, agent runs, review gates all tracked in one SQLite layer |
| Dev servers eat all your laptop's RAM | Pooled with max concurrency — warm vs sleeping, kill external port squatters from the UI |
| You manually poll "did the agent finish?" | A supervisor loop watches runs, transitions tasks, and surfaces blockers |
| Plans (Markdown) and runtime (DB) drift apart | Hybrid model: human-readable capsules + machine-readable runtime, kept in sync |
| Review is ad-hoc and inconsistent | 3 explicit gates per task — spec compliance, code quality, runtime verification |

TaskHelm is built for **single operators running many things at once** — solo CTOs, technical founders,
staff engineers acting as their own manager. v1 is open source, MIT, and works entirely offline against
your local filesystem.

> Read [`docs/01-product-vision.md`](./docs/01-product-vision.md) for the full design rationale.

---

## Quick start

**Install the workbench (CLI + dashboard):**

```bash
npm i -g taskhelm
taskhelm
# → boots the dashboard at http://127.0.0.1:4100 and opens your browser
```

**CLI only (no dashboard auto-launch):**

```bash
npm i -g @taskhelm/cli
taskhelm-cli project list
```

Requires **Node.js ≥ 22.14**. State lives at `~/.taskhelm/taskhelm.db` (override with `TASKHELM_DB`),
runtime cache at `~/.taskhelm/runtime/<version>` (override with `TASKHELM_HOME`), default port `4100`
(override with `TASKHELM_PORT` or `PORT`).

On first run the launcher prepares the local Next.js standalone runtime from assets shipped inside the
npm tarball — about 60–90 seconds, then cached for subsequent boots. No external services, no telemetry.

---

## What you get

<table>
<tr>
<td width="50%" valign="top">

### Projects & task capsules
Group work by project first. Each task gets its own folder on disk:

```
projects/<slug>/tasks/<id>/
  task.yaml      # minimal structured state
  context.md     # scope, assumptions, code pointers
  plan.md        # implementation plan + checks
  handoff.md     # current status, blockers
  review.md      # findings by gate
  artifacts/
```

Versionable in Git, readable without TaskHelm.

</td>
<td width="50%" valign="top">

### Workspace isolation
Per-task **branch + worktree + allocated port**, created from the dashboard
or CLI. Subrepos detected automatically. Existing unassigned worktrees can
be attached instead of recreated.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Pooled dev servers
Max concurrency per project, warm vs sleeping states, health checks, and
graceful shutdown. When an external process is squatting your port, the
dashboard pops a modal showing PID / command / user / cwd with a one-click
**Kill & Start**.

</td>
<td width="50%" valign="top">

### Agent orchestration
Implementer and reviewer agents are first-class **runs** attached to a task.
Append-only history. Shell adapter today; pluggable for future Claude Code /
Codex / Cursor adapters.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 3-gate review pipeline
Every task passes through `spec_compliance` → `code_quality` →
`runtime_verification`. Findings persisted per gate; recommendations surface
in the task cockpit.

</td>
<td width="50%" valign="top">

### Supervisor daemon
Local event loop that watches state, dispatches agents, transitions tasks,
recovers runtime state after crashes, and emits notifications — so you
don't sit polling a chat window.

</td>
</tr>
</table>

---

## Screenshots

<table>
<tr>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/demo-06-task-detail-hero.png" alt="Task cockpit hero" />
<br><sub><b>Task cockpit</b> — refer link, branch, worktree, port, dev state in one hero</sub>
</td>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/demo-08-task-detail-vault.png" alt="Context vault preview" />
<br><sub><b>Context vault</b> — link any folder, preview markdown + assets inline</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/demo-05-dev-pool.png" alt="Dev server pool" />
<br><sub><b>Dev pool</b> — runtime inventory across all projects, jump straight to owner task</sub>
</td>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/demo-02-welcome-vault-syntax.png" alt="In-app onboarding modal" />
<br><sub><b>In-app onboarding</b> — 4-step guide auto-shown on first run; reopen anytime from sidebar</sub>
</td>
</tr>
</table>

---

## How it works

```
┌──────────┐  ┌───────────────┐
│   CLI    │  │   Dashboard   │   equal first-class surfaces
└────┬─────┘  └───────┬───────┘
     │                │
     └────────┬───────┘
              ▼
      ┌──────────────┐
      │  Supervisor  │   event loop, scheduler, dispatcher,
      ├──────────────┤   recovery, notifier, dev-pool
      │  SQLite (WAL)│   runtime state — tasks, agent_runs, review_gates,
      ├──────────────┤   dev_servers, events, notifications, locks
      │ Disk capsules│   Markdown + YAML — context, plan, handoff, review
      └──────────────┘
```

Two complementary storage layers — **SQLite** for runtime truth, **Markdown/YAML** for human-readable
context that survives outside the tool. The supervisor updates SQLite first, then refreshes the Markdown
artifacts.

| Package | npm | Role |
|---|---|---|
| [`taskhelm`](https://www.npmjs.com/package/taskhelm) | [![v](https://img.shields.io/npm/v/taskhelm.svg?style=flat-square)](https://www.npmjs.com/package/taskhelm) | Launcher — preps runtime, opens dashboard |
| [`@taskhelm/cli`](https://www.npmjs.com/package/@taskhelm/cli) | [![v](https://img.shields.io/npm/v/@taskhelm/cli.svg?style=flat-square)](https://www.npmjs.com/package/@taskhelm/cli) | Commander CLI (`project`, `task`, `workspace`, `dev`, `agent`) |
| [`@taskhelm/core`](https://www.npmjs.com/package/@taskhelm/core) | [![v](https://img.shields.io/npm/v/@taskhelm/core.svg?style=flat-square)](https://www.npmjs.com/package/@taskhelm/core) | Domain model, SQLite repos, migrations, workspace utils |
| [`@taskhelm/supervisor`](https://www.npmjs.com/package/@taskhelm/supervisor) | [![v](https://img.shields.io/npm/v/@taskhelm/supervisor.svg?style=flat-square)](https://www.npmjs.com/package/@taskhelm/supervisor) | Event loop, dispatcher, dev-pool, recovery |

Stack: **Next.js 15 + React 19** (dashboard) · **Commander** (CLI) · **better-sqlite3** (state, WAL) ·
**TypeScript 5.7 strict** · **pnpm + Turborepo** · **Vitest + Playwright** (tests).

---

## V1 autonomy boundary

| Allowed by default | Not allowed by default |
|---|---|
| Create branch / worktree | Push branches |
| Allocate ports & dispatch agents | Merge or rebase shared branches |
| Edit code inside worktrees | Open / close PRs |
| Run local dev / test commands | Mutate external ticket systems |
| Run review pipeline | Anything that touches a remote you didn't explicitly authorize |
| Update task artifacts (capsules) | |

The autonomy line is intentional. v1 is built so you'd trust running it unattended on your laptop, not so
it can ship to prod for you.

---

## Development

```bash
git clone https://github.com/Kaka-123-D/TaskHelm.git
cd TaskHelm
pnpm install
pnpm run typecheck   # tsc --noEmit across all packages
pnpm run test        # Vitest in every package
pnpm run build       # core → supervisor → cli → web (sequenced)
pnpm --filter @taskhelm/web run dev   # dashboard at :4100
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide and [`CLAUDE.md`](./CLAUDE.md) for the
architectural conventions agents must follow when editing this repo.

---

## Documentation

| Doc | What it covers |
|---|---|
| [`docs/01-product-vision.md`](./docs/01-product-vision.md) | Why this exists, success criteria, non-goals |
| [`docs/02-v1-architecture.md`](./docs/02-v1-architecture.md) | System layers and boundaries |
| [`docs/06-domain-model.md`](./docs/06-domain-model.md) | Entities and state machines |
| [`docs/07-sqlite-schema.md`](./docs/07-sqlite-schema.md) | All runtime tables |
| [`docs/08-task-capsule-spec.md`](./docs/08-task-capsule-spec.md) | Markdown/YAML capsule format |
| [`docs/09-supervisor-event-model.md`](./docs/09-supervisor-event-model.md) | Event-driven automation |
| [`docs/10-cli-spec.md`](./docs/10-cli-spec.md) | CLI command groups |
| [`docs/11-web-dashboard-spec.md`](./docs/11-web-dashboard-spec.md) | Dashboard screens |
| [`docs/04-init-roadmap.md`](./docs/04-init-roadmap.md) | Phased implementation plan |

---

## Status

TaskHelm is in **active early development** — building toward a stable v1 cut. The runtime, dashboard,
CLI, supervisor, dev pool, and review pipeline are functional and can be used today. APIs may change
between minor versions until v1.0.0.

What's next: pluggable agent adapters (Claude Code, Codex, Cursor), richer notification surfaces, and a
spec-down compiler for review gates. See [`docs/04-init-roadmap.md`](./docs/04-init-roadmap.md).

---

## Star history

<a href="https://star-history.com/#Kaka-123-D/TaskHelm&Date">
  <img src="https://api.star-history.com/svg?repos=Kaka-123-D/TaskHelm&type=Date" alt="Star History Chart" width="700" />
</a>

If TaskHelm helps you, a star is the cheapest way to say so — and it makes the project visible to the
next person fighting the same coordination problem.

---

## Contributing

Issues, ideas, and PRs are all welcome. Especially valuable:

- Bug reports with a `~/.taskhelm/taskhelm.db` path and the steps that reproduced
- Adapters for other agents (Claude Code, Codex, Cursor, …)
- Reviewer prompts for the 3 review gates
- Improvements to the supervisor's recovery semantics

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). For larger changes, open an issue first so we can align
on shape before you build.

---

## License

[MIT](./LICENSE) © TaskHelm contributors.
