---
title: Teaching Claude Code about your CLI in 100 lines of Markdown
published: false
description: Why a SKILL.md alongside your npm package is the difference between an AI agent that uses your tool correctly and one that bypasses it entirely.
tags: claude, ai, devtools, productivity
canonical_url:
cover_image:
---

I shipped a small dev tool last month — [**TaskHelm**](https://github.com/vantienkhai/TaskHelm), a local-first workbench for parallel git-worktree work. It manages projects → tasks → worktrees → ports → pooled dev servers from one place, replacing the usual `git worktree add` + `lsof` + four-terminals dance.

A week after the npm release, I noticed something embarrassing: my own AI coding agents — Claude Code, Cursor, Copilot CLI — were happily **ignoring** the tool and running `git worktree add ../foo && cd ../foo && PORT=3001 npm run dev` like cavemen. They had no idea what `taskhelm workspace init` was, even though I'd documented it.

This is the failure mode of every CLI tool today. Your README is for humans. AI agents have stale training data, never read your docs, and aggressively pattern-match to commands they already know. Result: your tool gets bypassed.

The fix is one file. Here's what I learned writing it.

## What "skills" actually are

The [Anthropic Skill format](https://docs.claude.com/en/docs/claude-code/skills) is just a Markdown file with frontmatter:

```markdown
---
name: taskhelm
description: "Use when the user wants to manage parallel git-worktree work..."
---

# TaskHelm CLI

[content]
```

Claude Code reads the `description` to decide when to load the skill. The body is plain Markdown — no DSL, no compilation. Cursor, Copilot CLI, Codex, and every other agent runtime can consume the same file (sometimes renamed to `.mdc` or pasted into the system prompt).

## What I put in the skill that made it work

I tried three drafts. The first two failed; the third made the agent reliably use TaskHelm. The difference was:

### 1. The mental model — explicitly

Bad:
> TaskHelm helps you manage worktrees.

Good:
```
Project           = a git repo (slug, repo path, default dev_command)
  └─ Task         = a unit of work tied to one branch + worktree + port
       ├─ Branch      = git branch (created automatically by `workspace init`)
       ├─ Worktree    = ./.worktrees/<branch>/
       └─ Dev server  = pooled long-running process bound to a port
```

The agent now has a tree to anchor each command against. When the user says "start work on LRC-12752", the agent walks: that's a Task → needs a Workspace → which means a Branch + Worktree → then a Dev server.

### 2. Identifier resolution rules — every form, in priority order

My CLI accepts five different ways to specify a task: full ID, `<slug>:<key>`, ID prefix, exact key, or title substring. Without listing these, the agent invented IDs. With them listed:

```markdown
1. Full task id (21-char nanoid)
2. `<slug>:<key>` — disambiguates same key across projects
3. ID prefix ≥ 4 chars
4. Exact task key
5. Title substring ≥ 3 chars (case-insensitive)

Ambiguous match → exit code 2. No match → exit 1.
Prefer `<slug>:<key>` in scripts.
```

The agent now picks the right form depending on context (scripts vs. interactive).

### 3. A failure-mode catalog with root causes

This is the highest-ROI section. Every weird edge case in your CLI's wild ride deserves a row:

| Symptom | Cause / Fix |
|---|---|
| `Process is alive but port X is not in use` | Dev script crashed silently or binds elsewhere. Check `taskhelm dev logs`. |
| Dev server runs the wrong port despite `PORT` env | npm script hard-codes a port. Use `{{port}}` placeholder in `dev_command`. |
| `Max active dev servers (N) reached` | Stop another, or raise `max_active_dev_servers`. |

When the agent hits one of these errors at runtime, it now knows what to do instead of giving up or guessing.

## What I didn't put in (and shouldn't have)

- **Marketing fluff.** "TaskHelm is the most innovative…" — wastes context budget for zero behavior change.
- **Full command reference reproduction.** I link to `--help` and a one-line table; agents don't need every flag described in prose.
- **History / changelogs.** The skill is about right-now behavior. v0.1.13 is irrelevant.
- **More than one skill.** I considered splitting into `taskhelm-projects`, `taskhelm-tasks`, etc. — but for a CLI with ~14 commands, one focused 7 KB skill loads faster and is easier to consume than five 2 KB skills with progressive disclosure overhead.

## How to ship one for your CLI

1. Add a `skills/<your-tool>/SKILL.md` to your repo.
2. Frontmatter: `name` (matches folder), `description` (must include WHEN clauses with realistic user phrasings — "Use when the user wants to X").
3. Content: mental model, daily workflow recipe, command reference table, failure modes, scripting tips.
4. Add an install snippet to your README that drops it into `~/.claude/skills/<your-tool>/`.
5. Submit to [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) for discoverability.

## Result

After loading the skill, Claude Code now consistently produces:

> I'll run `taskhelm workspace init loverec:LRC-12752` to set up the branch and worktree, then `taskhelm dev start loverec:LRC-12752 --port 3001` to spin the dev server.

Instead of the previous default:

> I'll create a worktree with `git worktree add ../loverec-LRC-12752` and start the dev server on a free port…

That's the entire ROI of the skill: the agent uses your tool the way you designed it.

---

If you build a CLI in 2026 and don't ship a skill alongside the npm package, you're leaving a third of your users (the ones who delegate to AI agents) on the floor. It costs ~2 hours and one Markdown file.

Source for the TaskHelm skill: <https://github.com/vantienkhai/TaskHelm/tree/main/skills/taskhelm>
