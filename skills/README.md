# TaskHelm AI Agent Skills

Drop-in skill packs that teach AI coding agents (Claude Code, Cursor, Copilot CLI, Codex, etc.) how to drive **[TaskHelm](https://github.com/vantienkhai/TaskHelm)** — the local-first workbench for parallel git-worktree work, port allocation, and pooled dev servers.

These skills follow the [Anthropic Skill](https://docs.claude.com/en/docs/claude-code/skills) format (`SKILL.md` with frontmatter) so they load natively in Claude Code and any tool that supports the format. Plain markdown means they also work as system prompts, Cursor `.mdc` rules, or Copilot instructions with zero conversion.

## Available Skills

| Skill | When to invoke |
|---|---|
| [`taskhelm`](./taskhelm/SKILL.md) | Any task involving TaskHelm: spinning up a worktree, allocating a port, starting/stopping a pooled dev server, listing dev pool status, debugging a stuck dev server via `dev logs`. |

## Install

### Claude Code

```bash
mkdir -p ~/.claude/skills/taskhelm
curl -fsSL https://raw.githubusercontent.com/vantienkhai/TaskHelm/main/skills/taskhelm/SKILL.md \
  -o ~/.claude/skills/taskhelm/SKILL.md
```

Restart Claude Code. The skill auto-activates whenever the user mentions TaskHelm, worktrees, port allocation, or pooled dev servers.

### Project-scoped (any agent)

```bash
git clone --filter=blob:none --no-checkout https://github.com/vantienkhai/TaskHelm.git /tmp/taskhelm-skills
cd /tmp/taskhelm-skills && git sparse-checkout set skills && git checkout
cp -r /tmp/taskhelm-skills/skills /path/to/your/project/.claude/skills
```

### Cursor / Copilot CLI / Codex / others

The frontmatter is YAML and the body is plain markdown. Either:

- Drop `SKILL.md` into the agent's instruction directory (e.g. `.cursor/rules/taskhelm.mdc`, `.github/copilot-instructions.md`), or
- Concatenate it into your system prompt.

## Why publish skills for a CLI?

Most AI agents have stale or zero knowledge of niche CLIs. Without a skill, an agent will hallucinate flags, invent commands, or silently fall back to `git worktree add` directly — defeating the purpose of TaskHelm. The skill gives the agent:

- The mental model (project → task → workspace → dev server)
- Identifier resolution rules (full id / `<slug>:<key>` / prefix / title substring)
- Common failure modes and their root causes (`{{port}}` placeholder, IPv6-only Next.js binds, stale `failed` rows, etc.)
- Exit-code semantics for scripting

## Contributing

PRs welcome — especially:

- New skills for advanced workflows (e.g. multi-task parallelization recipes, capsule editing)
- Adapter scripts for other agent runtimes
- Real-world prompt examples that activated the skill correctly

Found a hallucination an agent still produces despite this skill? Open an issue with the prompt + the wrong output and we'll tighten the skill.

## License

Same as the parent repo — see [LICENSE](../LICENSE).
