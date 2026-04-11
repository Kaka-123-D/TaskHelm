import Table from 'cli-table3'
import type { Project, Task, ReviewGate, AgentRun } from '@taskhelm/core'

export function formatProjectsTable(
  projects: readonly Project[],
  taskCounts: ReadonlyMap<string, number>
): string {
  const table = new Table({
    head: ['slug', 'name', 'repo_root', 'tasks', 'specdown_mode'],
  })

  for (const p of projects) {
    table.push([
      p.slug,
      p.name,
      p.local_repo_root,
      String(taskCounts.get(p.id) ?? 0),
      p.specdown_mode,
    ])
  }

  return table.toString()
}

export function formatProjectDetail(
  project: Project,
  taskCount: number,
  activeCount: number
): string {
  const table = new Table()

  const rows: Array<[string, string]> = [
    ['id', project.id],
    ['slug', project.slug],
    ['name', project.name],
    ['description', project.description ?? ''],
    ['repo_root', project.local_repo_root],
    ['default_branch', project.default_branch ?? ''],
    ['dev_command', project.dev_command ?? ''],
    ['install_command', project.install_command ?? ''],
    ['test_command', project.test_command ?? ''],
    ['specdown_mode', project.specdown_mode],
    ['tasks', String(taskCount)],
    ['active_tasks', String(activeCount)],
    ['created_at', project.created_at],
    ['updated_at', project.updated_at],
  ]

  for (const [key, value] of rows) {
    table.push({ [key]: value })
  }

  return table.toString()
}

export function formatTasksTable(tasks: readonly Task[]): string {
  const table = new Table({
    head: ['id', 'key', 'title', 'status', 'phase', 'branch', 'port'],
  })

  for (const t of tasks) {
    table.push([
      t.id.slice(0, 8),
      t.key ?? '',
      t.title,
      t.status,
      t.phase,
      t.branch_name ?? '',
      t.port != null ? String(t.port) : '',
    ])
  }

  return table.toString()
}

export function formatTaskDetail(
  task: Task,
  gates: readonly ReviewGate[],
  activeRun: AgentRun | null
): string {
  const table = new Table()

  const rows: Array<[string, string]> = [
    ['id', task.id],
    ['project_id', task.project_id],
    ['key', task.key ?? ''],
    ['title', task.title],
    ['goal', task.goal ?? ''],
    ['status', task.status],
    ['phase', task.phase],
    ['priority', String(task.priority)],
    ['branch_name', task.branch_name ?? ''],
    ['worktree_path', task.worktree_path ?? ''],
    ['port', task.port != null ? String(task.port) : ''],
    ['source_type', task.source_type ?? ''],
    ['source_ref', task.source_ref ?? ''],
    ['latest_blocker', task.latest_blocker ?? ''],
    ['created_at', task.created_at],
    ['updated_at', task.updated_at],
  ]

  for (const [key, value] of rows) {
    table.push({ [key]: value })
  }

  let output = table.toString()

  if (gates.length > 0) {
    const gatesTable = new Table({
      head: ['gate_type', 'status', 'result', 'opened_at', 'closed_at'],
    })
    for (const g of gates) {
      gatesTable.push([
        g.gate_type,
        g.status,
        g.result ?? '',
        g.opened_at ?? '',
        g.closed_at ?? '',
      ])
    }
    output += '\n\nReview Gates:\n' + gatesTable.toString()
  }

  if (activeRun != null) {
    output += `\n\nActive Agent Run: ${activeRun.id} (${activeRun.kind} / ${activeRun.status})`
  }

  return output
}
