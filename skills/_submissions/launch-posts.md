# Launch post drafts

Three platforms, three different tones. Pick whichever, edit, post.

---

## 1. Show HN — `Show HN: TaskHelm – local workbench for parallel git-worktree work, with an AI agent skill`

**Title (max 80 chars):**
> Show HN: TaskHelm – local workbench for parallel git-worktree work + AI agent skill

**Body:**

Hi HN,

I built TaskHelm out of frustration with the usual `git worktree add ../foo && cd ../foo && lsof -i :3000 && PORT=3001 npm run dev` cycle. Whenever I had 4–5 tickets in flight (review one branch, start another, hotfix on prod, demo a feature), I'd lose 30 minutes a day to that dance.

TaskHelm is a single npm install (`npm i -g taskhelm`) that gives you:

- A SQLite-backed registry of projects, tasks, and dev-server ports
- A web dashboard at `127.0.0.1:4100` and an equivalent CLI (`taskhelm task`, `taskhelm workspace`, `taskhelm dev`)
- Pooled dev servers — start `npm run dev` per worktree on auto-allocated ports, with healthchecks that catch IPv6-only binds and crashed-but-still-alive PIDs
- A `{{port}}` placeholder for projects with hard-coded ports in package.json
- Local logs you can tail (`taskhelm dev logs <task> -f`)

What I think makes it interesting on HN is the **AI agent skill** I shipped alongside it: <https://github.com/vantienkhai/TaskHelm/tree/main/skills/taskhelm>

I noticed that AI coding agents (Claude Code, Cursor, Copilot CLI) immediately fall back to raw `git worktree add` when you ask them to "start work on ticket X" — defeating the point of TaskHelm. So I wrote a single `SKILL.md` (Anthropic skill format) that teaches the agent the mental model + identifier-resolution rules + failure modes. With it loaded, the agent will say "I'll run `taskhelm workspace init loverec:LRC-12752` then `taskhelm dev start loverec:LRC-12752`" instead of fighting me.

Tech stack: TypeScript + Next.js 15 + better-sqlite3 + Commander. pnpm workspace, four packages. Open source.

Repo: <https://github.com/vantienkhai/TaskHelm>

Happy to answer questions on the architecture, the SQLite schema, or the agent-skill format.

---

## 2. Reddit — r/ClaudeAI

**Title:**
> I shipped my CLI as both an npm package and a Claude Code skill — here's what I learned

**Body:**

Built a small dev tool called **TaskHelm** (local-first workbench for git-worktree + dev-server management) and shipped two things:

1. The CLI itself: `npm i -g taskhelm` → opens a web dashboard at `127.0.0.1:4100` and adds CLI commands.
2. A Claude Code skill: <https://github.com/vantienkhai/TaskHelm/tree/main/skills/taskhelm> — single `SKILL.md`, drop it into `~/.claude/skills/taskhelm/`.

What surprised me: without the skill, Claude Code would happily ignore TaskHelm and run raw `git worktree add` + manual port juggling. With the skill, it correctly says `taskhelm workspace init <slug>:<key>` then `taskhelm dev start <task> --port 3001`.

The skill is ~7 KB, written in plain markdown with the Anthropic frontmatter (`name`, `description`). What made it actually work for me:
- Including the **mental model** explicitly (project → task → worktree → port)
- Listing the **identifier-resolution rules** (the agent kept inventing IDs before I added these)
- A **failure-mode catalog** with root causes (e.g. why `next dev` ignores `PORT` and you need a `{{port}}` placeholder)

If anyone has tips on getting these into the skill discovery flow, I'd love to hear. Looking at submitting to awesome-claude-code next.

---

## 3. Reddit — r/cursor

**Title:**
> TaskHelm — git-worktree dev workbench, with a Cursor rule for parallel-task workflows

**Body:**

Quick share — `npm i -g taskhelm` gives you a local web dashboard + CLI for managing parallel git worktrees, ports, and dev servers per ticket. SQLite-backed, no remote.

For Cursor users: there's an `.mdc` rule at <https://github.com/vantienkhai/TaskHelm/tree/main/skills/taskhelm/cursor.mdc> that tells Cursor agents exactly how to drive the CLI (mental model, command reference, failure modes).

Without the rule, my agent kept inventing flags. With it, it picks the right `<slug>:<key>` form and uses `dev start --port 3001 --command "..."` cleanly.

Open source: <https://github.com/vantienkhai/TaskHelm>

---

## 4. Twitter / X — short form

```
Just shipped TaskHelm v0.1.17 🚢

Local-first workbench for parallel git-worktree work:
🌳 per-ticket branches + worktrees
🔌 pooled dev servers w/ port allocation
🪵 healthchecks, log tailing
🧠 ships with an AI agent skill so Claude/Cursor/Copilot CLI actually use it

npm i -g taskhelm
github.com/vantienkhai/TaskHelm
```

(280 chars version)

```
Shipped TaskHelm v0.1.17:
- per-ticket worktrees + ports + pooled dev servers
- AI skill so Claude/Cursor stop reaching for raw `git worktree`

npm i -g taskhelm
github.com/vantienkhai/TaskHelm
```
