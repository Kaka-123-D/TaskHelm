# TaskHelm CLI Spec

## Philosophy

The CLI is not a debug afterthought.

It is a first-class control surface for:

- power users
- scripts
- automation
- fallback when the dashboard is closed

## Command Groups

### Project Commands

```bash
taskhelm project create
taskhelm project import
taskhelm project list
taskhelm project show <project>
taskhelm project bind-specdown <project>
```

### Task Commands

```bash
taskhelm task create
taskhelm task import
taskhelm task list --project <project>
taskhelm task show <task>
taskhelm task open <task>
taskhelm task archive <task>
```

### Workspace Commands

```bash
taskhelm workspace init <task>
taskhelm workspace open <task>
taskhelm workspace status <task>
taskhelm workspace cleanup <task>
```

### Agent Commands

```bash
taskhelm agent run implementer <task>
taskhelm agent run spec-review <task>
taskhelm agent run code-review <task>
taskhelm agent run verify <task>
taskhelm agent status <task>
```

### Runtime Commands

```bash
taskhelm dev start <task>
taskhelm dev stop <task>
taskhelm dev sleep <task>
taskhelm dev wake <task>
taskhelm dev pool
```

### Sync Commands

```bash
taskhelm specdown pull-context <project>
taskhelm specdown push-task <task>
taskhelm specdown link <project>
```

## Output Rules

- table output by default
- `--json` for automation
- concise summaries for operator flow
- paths should always be absolute

## V1 Must-Have Commands

- `project create`
- `project list`
- `task create`
- `task list`
- `task show`
- `workspace init`
- `workspace open`
- `agent status`
- `dev start`
- `dev stop`

## UX Constraint

The CLI should help the user manage many projects without losing task-local detail.
