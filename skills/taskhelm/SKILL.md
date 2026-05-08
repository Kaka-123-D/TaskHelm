---
name: taskhelm
description: "Use when the user wants to manage parallel git-worktree work, run multiple dev servers, allocate ports, or organize tasks per feature branch via the TaskHelm CLI. Examples: \"Spin up a worktree for ticket FOO-42\", \"Start the dev server on port 12752\", \"List all running dev servers\", \"Show me which port my task is using\""
---

# TaskHelm CLI

TaskHelm is a local-first workbench for parallel git-worktree work. It manages **projects → tasks → worktrees → ports → dev servers** from one place — replacing the `git worktree add` + `lsof` + four-terminals dance.

Install: `npm install -g taskhelm`. State lives at `~/.taskhelm/taskhelm.db` (SQLite). Logs at `~/.taskhelm/logs/`.

## Mental Model

```
Project           = a git repo (slug, repo path, default dev_command, max concurrent dev servers)
  └─ Task         = a unit of work tied to one branch + worktree + (optional) preferred port
       ├─ Branch      = git branch (created automatically by `workspace init`)
       ├─ Worktree    = ./.worktrees/<branch>/ inside the repo
       └─ Dev server  = pooled long-running process bound to a port
```

The CLI never touches the remote: no push, no PR, no merge. It only manipulates local branches, worktrees, ports, and child processes.

## Daily Workflow

```bash
# 1. Register a project once
taskhelm project create \
  --name "LoveRec" --slug loverec \
  --repo /Users/me/code/loverec \
  --dev-command "npm run dev -- -p {{port}}" \
  --install-command "npm i"

# 2. Create a task for the ticket you're picking up
taskhelm task create --project loverec --title "LRC-12752 popup creator" --key LRC-12752

# 3. Spin up a branch + worktree for it
taskhelm workspace init loverec:LRC-12752

# 4. Start the dev server (port auto-allocated)
taskhelm dev start loverec:LRC-12752

# 5. Tail logs while you work
taskhelm dev logs loverec:LRC-12752 -f

# 6. When done with the worktree (branch is preserved)
taskhelm dev stop loverec:LRC-12752
taskhelm workspace cleanup loverec:LRC-12752 -y
```

## Identifier Resolution (Important)

Every command that takes `<taskId>` accepts **five forms**, in this priority order:

1. **Full task id** — exact 21-char nanoid (`WCg1Wjsfzn-gDOveINn77`)
2. **`<slug>:<key>`** — disambiguates same key across projects (`loverec:LRC-12752`)
3. **ID prefix ≥ 4 chars** — first match by `id LIKE 'WCg1%'`
4. **Exact key** — only if globally unique
5. **Title substring ≥ 3 chars** — case-insensitive

If multiple tasks match, the CLI prints them and **exits with code 2**. If nothing matches, **exit code 1**. Always prefer `<slug>:<key>` in scripts; titles are user-facing and may collide.

## Command Reference

### `taskhelm project`

| Command | Notes |
|---|---|
| `create --name --slug --repo [--dev-command] [--install-command] [--default-branch] [--description]` | `dev-command` may use `{{port}}` placeholder which TaskHelm substitutes at spawn time. |
| `list [--json]` | One-line table: slug, name, repo_root, task count |
| `show <slug> [--json]` | Full project metadata |

**`{{port}}` placeholder** — write commands like `npm run dev -- -p {{port}}` when the npm script hard-codes a port (Next.js' `next dev -p 3000`, Vite, etc.). TaskHelm substitutes it before `spawn()`.

### `taskhelm task`

| Command | Notes |
|---|---|
| `create --project <slug> --title [--goal] [--key] [--refer-link] [--priority]` | Persists the task in the local SQLite DB (no files are written into your repo). |
| `list --project <slug> [--json]` | Full IDs are printed (no truncation). |
| `show <id> [--json]` | Accepts any of the 5 identifier forms. |

### `taskhelm workspace`

| Command | Notes |
|---|---|
| `init <taskId>` | Creates branch (idempotent) + worktree under `<repo>/.worktrees/<branch>/`. Branch name follows project's `branch_naming_pattern` (default `task/{id}`). |
| `status <taskId>` | Shows branch, worktree path, and whether the worktree exists on disk. |
| `cleanup <taskId> [-y/--yes]` | Removes the worktree, clears `branch_name`/`worktree_path` on the task. **Branch is preserved** so commits aren't lost. Without `-y` you'll be prompted to confirm. |

### `taskhelm dev`

| Command | Notes |
|---|---|
| `start <taskId> [--port N] [--command "<cmd>"]` | Allocates port (or uses `--port`), spawns project's `dev_command` (or `--command` override) in the worktree, runs a delayed health check. Stale `failed`/`stopped` rows on the same port are auto-reclaimed. |
| `stop <taskId>` | Sends SIGTERM, releases port, marks row `stopped`. |
| `logs <taskId> [-n N] [-f/--follow]` | Prints the log path and `tail`s the file. Last 50 lines by default; `-f` follows like `tail -f`. |
| `pool [--project <slug>]` | Table of all dev servers (active + sleeping). Filter by project. |

**Port behavior:**
- Default range `3001–3100` (auto-allocated).
- `--port` skips auto-allocation, reclaims any stale row holding that port, and verifies the OS-level port is free before spawning.
- `task.preferred_port` (set via Web UI) is what the Web dashboard uses; CLI does not currently read it — pass `--port` explicitly when scripting.

**Healthcheck:** after spawn, TaskHelm waits 3.5 s, then checks both `127.0.0.1` and `::1` via TCP `connect()`. If neither bind, the process is killed and the row is marked `failed`. The error message + last 4 KB of log are saved to the DB.

## Common Failure Modes

| Symptom | Cause / Fix |
|---|---|
| `Port X is already in use` | An external (non-TaskHelm) process holds the port. Find it via `lsof -i :X`. |
| `Process is alive but port X is not in use` | Dev script crashed silently or binds a different port. Check `taskhelm dev logs <taskId>`. |
| `Max active dev servers (N) reached` | Stop another dev server, or raise `max_active_dev_servers` on the project (Web UI only at the moment). |
| `Task has no worktree_path` | Run `taskhelm workspace init <taskId>` first. |
| Dev server runs the wrong port despite `PORT` env | The npm script hard-codes a port. Use `{{port}}` placeholder in `dev_command`. |

## Scripting Tips

- `--json` is supported on every read command (`list`, `show`, `pool` is plain table only). Pipe into `jq` for shell scripts.
- Exit codes: `0` success, `1` not-found / fatal, `2` ambiguous identifier.
- The DB at `~/.taskhelm/taskhelm.db` is plain SQLite (WAL mode). It's safe to query directly read-only when the CLI isn't running migrations:
  ```bash
  sqlite3 ~/.taskhelm/taskhelm.db 'SELECT id, title FROM tasks WHERE project_id = ?' <project_id>
  ```
- Override the DB path with `TASKHELM_DB=/path/to.db` and the dashboard port with `TASKHELM_PORT=4101`.

## When NOT to Use

- Editing remote state: TaskHelm never pushes, opens PRs, or syncs with Jira/Linear. Use `gh`, `git push`, or other tools for that.
- Repos without a working tree (bare repos): worktrees require a checked-out HEAD.
- CI: TaskHelm is for local dev. Use real CI runners in CI.

## Resources

- Repo: <https://github.com/vantienkhai/TaskHelm>
- npm: `taskhelm` (binary `taskhelm`, CLI mode when called with args)
- Default dashboard: <http://127.0.0.1:4100>
