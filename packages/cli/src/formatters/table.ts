import Table from 'cli-table3'
import type { Project, Task } from '@taskhelm/core'

export function formatProjectsTable(
  projects: readonly Project[],
  taskCounts: ReadonlyMap<string, number>
): string {
  const table = new Table({
    head: ['slug', 'name', 'repo_root', 'tasks'],
  })

  for (const p of projects) {
    table.push([
      p.slug,
      p.name,
      p.local_repo_root,
      String(taskCounts.get(p.id) ?? 0),
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
    head: ['id', 'key', 'title', 'priority', 'branch', 'port'],
  })

  for (const t of tasks) {
    table.push([
      t.id.slice(0, 8),
      t.key ?? '',
      t.title,
      String(t.priority),
      t.branch_name ?? '',
      t.port != null ? String(t.port) : '',
    ])
  }

  return table.toString()
}

export function formatTaskDetail(task: Task): string {
  const table = new Table()

  const rows: Array<[string, string]> = [
    ['id', task.id],
    ['project_id', task.project_id],
    ['key', task.key ?? ''],
    ['title', task.title],
    ['goal', task.goal ?? ''],
    ['priority', String(task.priority)],
    ['branch_name', task.branch_name ?? ''],
    ['worktree_path', task.worktree_path ?? ''],
    ['port', task.port != null ? String(task.port) : ''],
    ['refer_link', task.refer_link ?? ''],
    ['latest_blocker', task.latest_blocker ?? ''],
    ['created_at', task.created_at],
    ['updated_at', task.updated_at],
  ]

  for (const [key, value] of rows) {
    table.push({ [key]: value })
  }

  return table.toString()
}
