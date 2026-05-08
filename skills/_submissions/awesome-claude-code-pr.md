# Awesome-Claude-Code submission

**Target:** <https://github.com/hesreallyhim/awesome-claude-code>

**Why this submission has a good chance:**
- Real, working npm package (`taskhelm`) with multiple released versions
- Skill is a single self-contained `SKILL.md` with proper Anthropic frontmatter
- Skill solves a concrete problem (agents hallucinating worktree commands) — not a generic prompt collection
- Permissive license matches the repo's policy

**Section to add it under:** `Skills` (if exists) or `Tools / Workflows`. Check the README first.

---

## Contributing flow

```bash
gh repo fork hesreallyhim/awesome-claude-code --clone --remote
cd awesome-claude-code
git checkout -b add-taskhelm-skill
# Edit README.md — add the entry below in the right section
git add README.md
git commit -m "Add TaskHelm CLI skill"
git push -u origin add-taskhelm-skill
gh pr create --title "Add TaskHelm CLI skill" --body-file ../taskhelm-pr-body.md
```

## README entry to paste (single line in alphabetical order)

```markdown
- **[TaskHelm CLI](https://github.com/vantienkhai/TaskHelm/tree/main/skills/taskhelm)** — Skill for the TaskHelm CLI (local-first git-worktree workbench: pooled dev servers, port allocation, per-task branches/worktrees). Teaches agents the mental model, identifier-resolution rules, and the failure-mode catalog.
```

## PR body

```markdown
## Summary

Adds an entry for the TaskHelm CLI skill — a single `SKILL.md` (Anthropic format) that teaches Claude Code, Cursor, Copilot CLI, and Codex how to drive [TaskHelm](https://github.com/vantienkhai/TaskHelm), a local-first workbench for parallel git-worktree work.

## Why it's useful

Without this skill, agents fall back to raw `git worktree add` + `lsof` + four terminals — losing the per-task branch/worktree/port abstraction TaskHelm provides. The skill gives the agent:

- Mental model (project → task → worktree → port → pooled dev server)
- Identifier resolution rules (full id / `<slug>:<key>` / prefix / title substring)
- Failure-mode catalog (`{{port}}` placeholder for hard-coded ports, IPv6-only Next.js binds, stale `failed` rows in the dev pool, etc.)
- Exit-code semantics for scripting

## Verification

- TaskHelm is published on npm as `taskhelm` — `npm view taskhelm` shows the live package
- The skill source is at <https://github.com/vantienkhai/TaskHelm/tree/main/skills/taskhelm>
- License: same as the parent repo (permissive)

## Test plan

- [ ] Skill loads in Claude Code by dropping it under `~/.claude/skills/taskhelm/SKILL.md`
- [ ] Frontmatter `name` matches folder name
- [ ] `description` includes activation examples
```
