# Awesome-Claude-Code submission

**Target:** <https://github.com/hesreallyhim/awesome-claude-code>

> ⚠️ **MUST be submitted manually via the github.com UI.** The repo's issue template and Code of Conduct **explicitly forbid `gh` CLI / programmatic submissions** — automated ones get auto-closed and may flag the submitter's account. Do not attempt the fork+PR route either; the project intakes resources only through their issue form, which auto-creates the PR after maintainer review.

## How to submit (5 minutes)

1. Open <https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml> in a logged-in browser.
2. Fill the form using the exact answers below — copy-paste, do not re-word (the validation bot pattern-matches).
3. Tick all checkboxes (you must in good conscience be the one submitting; this is your project, you qualify).
4. Submit. The validation bot comments within minutes; the maintainer reviews on their schedule.

## Form answers

### Issue title
```
[Resource]: TaskHelm
```

### Display Name
```
TaskHelm
```

### Category
```
Agent Skills
```

### Sub-Category
```
General
```

### Primary Link
```
https://github.com/vantienkhai/TaskHelm
```

### Author Name
```
vantienkhai
```

### Author Link
```
https://github.com/vantienkhai
```

### License
```
MIT
```

### Description
> 1–3 sentences, descriptive (not promotional), no emojis, doesn't address the reader. The template is strict about this.

```
TaskHelm is a local-first workbench for parallel git-worktree development. It manages projects, tasks, branches, worktrees, ports, and a pooled set of dev servers from one dashboard, with a CLI mirror. The companion skill teaches Claude Code its mental model, identifier-resolution rules, and failure-mode catalog so the agent uses the CLI correctly instead of falling back to raw `git worktree` commands.
```

### Validate Claims
> "Suggest a low-friction way for me, or anyone, to prove it to themselves that what you're claiming is true."

```
Install TaskHelm with `npm i -g taskhelm` and drop the skill into Claude Code:

  mkdir -p ~/.claude/skills/taskhelm
  curl -fsSL https://raw.githubusercontent.com/vantienkhai/TaskHelm/main/skills/taskhelm/SKILL.md \
    -o ~/.claude/skills/taskhelm/SKILL.md

Restart Claude Code. Without the skill, Claude reaches for `git worktree add` and manual port handling. With the skill, it consistently uses `taskhelm workspace init <slug>:<key>` and `taskhelm dev start ... --port N`.
```

### Specific Task(s)
```
Open a project that uses TaskHelm (any git repo registered with `taskhelm project create`) and ask Claude Code to start work on a task that does not have a worktree yet. Observe whether it uses `taskhelm` commands or falls back to `git worktree`.
```

### Specific Prompt(s)
```
Without the skill: "Start work on ticket LRC-12752 in the Loverec project."

With the skill installed, the same prompt should produce:
  taskhelm workspace init loverec:LRC-12752
  taskhelm dev start loverec:LRC-12752

instead of raw git worktree commands.
```

### Additional Comments
```
The skill is a single ~7KB SKILL.md with the standard Anthropic frontmatter. The companion CLI is published on npm as `taskhelm` (multiple released versions). The same skill body works as a Cursor `.mdc` rule (see skills/taskhelm/cursor.mdc in the repo).
```

### Mandatory checkboxes (all required)

- [x] I have checked that this resource hasn't already been submitted
- [x] It has been over one week since the first public commit to the repo I am recommending
- [x] All provided links are working and publicly accessible
- [x] I do NOT have any other open issues in this repository
- [x] I am primarily composed of human-y stuff and not electrical circuits

---

## Pre-submission self-check

The repo includes `.claude/commands/evaluate-repository.md` — a Claude Code prompt the maintainer runs on submissions. Suggested: run it locally on TaskHelm before submitting to surface any issues the reviewer will hit.

```bash
gh api repos/hesreallyhim/awesome-claude-code/contents/.claude/commands/evaluate-repository.md \
  --jq '.content' | base64 -d
```

## Why this submission is unique vs existing entries

Looking at existing skill submissions in `THE_RESOURCES_TABLE.csv`:

- Most "Agent Skills > General" entries are general-purpose helpers (workflow systems, code-review skills).
- TaskHelm is a **specific CLI** with a **companion skill**, not a general-purpose framework. The skill exists to make a real npm-published tool work correctly with AI agents.
- That niche (CLI-with-AI-skill) is currently underrepresented in the list.
