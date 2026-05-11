import chalk from 'chalk'
import Table from 'cli-table3'
import type Database from 'better-sqlite3'
import { ProjectRepository, TaskRepository, TaskSubrepoRepository } from '@taskhelm/core'
import type { Task, TaskSubrepo } from '@taskhelm/core'

const ID_PREFIX_MIN = 4
const TITLE_SUBSTR_MIN = 3

interface TaskCandidate {
  readonly task: Task
  readonly projectSlug: string
}

function printAmbiguous(
  identifier: string,
  candidates: readonly TaskCandidate[]
): void {
  console.error(
    chalk.red(`Ambiguous task identifier: "${identifier}" matches ${candidates.length} tasks`)
  )
  const table = new Table({ head: ['id', 'project', 'key', 'title'] })
  for (const { task, projectSlug } of candidates) {
    table.push([task.id, projectSlug, task.key ?? '', task.title])
  }
  console.error(table.toString())
  console.error(chalk.dim('Use a more specific identifier (full id, longer prefix, or unique title fragment).'))
}

/**
 * Resolve a user-provided task identifier into a Task. Accepts:
 *   - Full task id (21 chars, exact)
 *   - <project-slug>:<task-key>
 *   - Task id prefix (>= 4 chars)
 *   - Exact task key (must be unique across all projects)
 *   - Title substring (>= 3 chars, case-insensitive)
 *
 * On ambiguity prints the matching tasks and exits 2; on no match exits 1.
 */
export function resolveTaskOrExit(db: Database.Database, identifier: string): Task {
  const projectRepo = new ProjectRepository(db)
  const taskRepo = new TaskRepository(db)

  const exact = taskRepo.findById(identifier)
  if (exact) return exact

  if (identifier.includes(':')) {
    const idx = identifier.indexOf(':')
    const slug = identifier.slice(0, idx)
    const key = identifier.slice(idx + 1)
    const project = projectRepo.findBySlug(slug)
    if (project && key.length > 0) {
      const matches = taskRepo
        .findByProjectId(project.id)
        .filter(t => t.key === key)
      if (matches.length === 1) return matches[0]
      if (matches.length > 1) {
        printAmbiguous(
          identifier,
          matches.map(task => ({ task, projectSlug: project.slug }))
        )
        process.exit(2)
      }
    }
  }

  const projects = projectRepo.findAll()
  const candidates: TaskCandidate[] = []
  const seen = new Set<string>()
  const lower = identifier.toLowerCase()

  for (const p of projects) {
    const tasks = taskRepo.findByProjectId(p.id)
    for (const t of tasks) {
      const matches =
        (identifier.length >= ID_PREFIX_MIN && t.id.startsWith(identifier)) ||
        (t.key != null && t.key === identifier) ||
        (identifier.length >= TITLE_SUBSTR_MIN && t.title.toLowerCase().includes(lower))

      if (matches && !seen.has(t.id)) {
        candidates.push({ task: t, projectSlug: p.slug })
        seen.add(t.id)
      }
    }
  }

  if (candidates.length === 1) return candidates[0].task
  if (candidates.length > 1) {
    printAmbiguous(identifier, candidates)
    process.exit(2)
  }

  console.error(chalk.red(`Task not found: ${identifier}`))
  console.error(
    chalk.dim(
      'Try: full task id, <project-slug>:<key>, id-prefix (>=4 chars), exact key, or title substring (>=3 chars)'
    )
  )
  process.exit(1)
}

/**
 * Resolve a `--subrepo <repoPath>` flag against a task's task_subrepos. Exits
 * 1 if the subrepo is not registered (with a helpful list of valid repo
 * paths). Repo-path comparison is exact.
 */
export function resolveTaskSubrepoOrExit(
  db: Database.Database,
  task: Task,
  repoPath: string,
): TaskSubrepo {
  const repo = new TaskSubrepoRepository(db)
  const match = repo.findByTaskIdAndRepoPath(task.id, repoPath)
  if (match) return match

  const all = repo.findByTaskId(task.id)
  console.error(chalk.red(`Subrepo "${repoPath}" is not configured for task ${task.id}`))
  if (all.length > 0) {
    console.error(chalk.dim('Configured subrepos for this task:'))
    for (const row of all) {
      console.error(chalk.dim(`  - ${row.repo_path}`))
    }
  } else {
    console.error(chalk.dim('This task has no subrepos configured yet.'))
  }
  process.exit(1)
}
