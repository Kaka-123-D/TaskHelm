<div align="center">

# TaskHelm

**Local-first visual workbench for parallel git-worktree work.**

Stop juggling `git worktree add`, `lsof -i`, and four terminal tabs. Manage every task,
branch, worktree, port, and dev server from one dashboard on your machine.

[![npm version](https://img.shields.io/npm/v/taskhelm.svg?color=f5a623&label=taskhelm&style=flat-square)](https://www.npmjs.com/package/taskhelm)
[![npm downloads](https://img.shields.io/npm/dm/taskhelm.svg?color=f5a623&style=flat-square)](https://www.npmjs.com/package/taskhelm)
[![license](https://img.shields.io/github/license/Kaka-123-D/TaskHelm?color=2f6df6&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/taskhelm.svg?color=2f6df6&style=flat-square)](./package.json)
[![GitHub stars](https://img.shields.io/github/stars/Kaka-123-D/TaskHelm?style=flat-square&color=f5a623)](https://github.com/Kaka-123-D/TaskHelm/stargazers)

<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/docs/screenshots/demo-04-project-detail.png" alt="TaskHelm project workbench" width="900" />

</div>

---

## Why TaskHelm

The git-worktree workflow is the right answer for running multiple branches in parallel — but the
existing tooling is all CLI. You memorize commands, juggle terminals, and keep a private mental map of
which branch lives at which path on which port. As soon as you have four or five tasks in flight, the
coordination layer becomes a person. You.

**TaskHelm replaces that mental map with a UI.** It's the local control plane for parallel-worktree
development:

| Without TaskHelm | With TaskHelm |
|---|---|
| `git worktree add ../foo feat/foo`, `cd ../foo`, `pnpm i`, `lsof -i :3001`, … repeat per task | One click creates branch + worktree + port for a task |
| Which task is on which branch? Which worktree is at which path? Which port? | All visible in a single dashboard, sortable per project |
| Dev servers eat all your laptop's RAM | Pooled with max concurrency — warm vs sleeping, kill external port squatters from the UI |
| External process squatting your port? `kill -9 $(lsof -ti :3001)` | Modal shows PID / command / user / cwd, one-click **Kill & Start** |
| Plans and notes live in chat sessions and die with them | Each task owns a Markdown folder on disk that survives crashes, restarts, and tool resets |

TaskHelm is built for **single operators running many things at once** — solo CTOs, technical founders,
staff engineers acting as their own manager. Open source, MIT, works entirely offline against your
local filesystem.

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

### Worktree-aware task list
Per project, every task shows its branch, worktree path, and allocated
port at a glance. Sortable, searchable, and the source of truth for
"what's running where".

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

### Context vault preview
Link any folder into a task and TaskHelm renders Markdown notes inline
with embedded images, videos, and diagrams. `[@path]` references resolve
across the linked tree.

</td>
<td width="50%" valign="top">

### CLI parity
Every dashboard action is also a CLI command — `project`, `task`,
`workspace`, `dev` groups. The CLI and the dashboard read/write the same
SQLite file, so you can mix freely.

</td>
</tr>
</table>

---

## AI agent skills

A drop-in skill pack that teaches Claude Code, Cursor, Copilot CLI, Codex, and other AI coding agents
how to drive TaskHelm — the mental model, the identifier-resolution rules, the failure-mode catalog.
Without it, agents will fall back to raw `git worktree add` and miss the whole point of TaskHelm.

```bash
# Claude Code
mkdir -p ~/.claude/skills/taskhelm
curl -fsSL https://raw.githubusercontent.com/vantienkhai/TaskHelm/main/skills/taskhelm/SKILL.md \
  -o ~/.claude/skills/taskhelm/SKILL.md
```

For Cursor / Copilot CLI / generic agents, see [`skills/`](./skills).

---

## Screenshots

<table>
<tr>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/docs/screenshots/demo-06-task-detail-hero.png" alt="Task cockpit hero" />
<br><sub><b>Task cockpit</b> — refer link, branch, worktree, port, dev state in one hero</sub>
</td>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/docs/screenshots/demo-08-task-detail-vault.png" alt="Context vault preview" />
<br><sub><b>Context vault</b> — link any folder, preview markdown + assets inline</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/docs/screenshots/demo-05-dev-pool.png" alt="Dev server pool" />
<br><sub><b>Dev pool</b> — runtime inventory across all projects, jump straight to owner task</sub>
</td>
<td width="50%" align="center">
<img src="https://raw.githubusercontent.com/Kaka-123-D/TaskHelm/main/docs/screenshots/demo-02-welcome-vault-syntax.png" alt="In-app onboarding modal" />
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
      │  SQLite (WAL)│   runtime state — projects, tasks,
      └──────────────┘   dev_servers, locks, events, notifications
```

State lives entirely in a single SQLite file at `~/.taskhelm/taskhelm.db` — TaskHelm does not write
anything into your project repos. Per-task notes can be linked from the **Context Vault** (any folder
of Markdown files on disk, indexed but not owned by TaskHelm).

| Package | npm | Role |
|---|---|---|
| [`taskhelm`](https://www.npmjs.com/package/taskhelm) | [![v](https://img.shields.io/npm/v/taskhelm.svg?style=flat-square)](https://www.npmjs.com/package/taskhelm) | Launcher — preps runtime, opens dashboard |
| [`@taskhelm/cli`](https://www.npmjs.com/package/@taskhelm/cli) | [![v](https://img.shields.io/npm/v/@taskhelm/cli.svg?style=flat-square)](https://www.npmjs.com/package/@taskhelm/cli) | Commander CLI (`project`, `task`, `workspace`, `dev`) |
| [`@taskhelm/core`](https://www.npmjs.com/package/@taskhelm/core) | [![v](https://img.shields.io/npm/v/@taskhelm/core.svg?style=flat-square)](https://www.npmjs.com/package/@taskhelm/core) | Domain model, SQLite repos, migrations, workspace utils |
| [`@taskhelm/supervisor`](https://www.npmjs.com/package/@taskhelm/supervisor) | [![v](https://img.shields.io/npm/v/@taskhelm/supervisor.svg?style=flat-square)](https://www.npmjs.com/package/@taskhelm/supervisor) | Dev-server pool + crash recovery |

Stack: **Next.js 15 + React 19** (dashboard) · **Commander** (CLI) · **better-sqlite3** (state, WAL) ·
**TypeScript 5.7 strict** · **pnpm + Turborepo** · **Vitest + Playwright** (tests).

---

## Autonomy boundary

| Allowed by default | Not allowed by default |
|---|---|
| Create branch / worktree | Push branches |
| Allocate ports & start dev servers | Merge or rebase shared branches |
| Edit code inside worktrees | Open / close PRs |
| Run local dev / test commands | Mutate external ticket systems |
| Update task records in the local SQLite DB | Anything that touches a remote you didn't explicitly authorize |

The line is intentional. TaskHelm is built so you'd trust running it unattended on your laptop, not so
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
| [`docs/10-cli-spec.md`](./docs/10-cli-spec.md) | CLI command groups |
| [`docs/11-web-dashboard-spec.md`](./docs/11-web-dashboard-spec.md) | Dashboard screens |
| [`docs/04-init-roadmap.md`](./docs/04-init-roadmap.md) | Phased implementation plan |

---

## Status

TaskHelm is in **active early development** — building toward a stable v1 cut. The runtime, dashboard,
CLI, dev pool, and context vault are functional today. APIs may change between minor versions until v1.0.0.

What's next: richer worktree visualization (graph view), better stale-worktree cleanup, multi-repo
projects, and a "switch task" command palette. See [`docs/04-init-roadmap.md`](./docs/04-init-roadmap.md).

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
- UX improvements to the worktree task list and dev-pool views
- Better stale-worktree detection / cleanup heuristics
- Multi-repo / monorepo subrepo handling

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). For larger changes, open an issue first so we can align
on shape before you build.

---

## License

[MIT](./LICENSE) © TaskHelm contributors.
