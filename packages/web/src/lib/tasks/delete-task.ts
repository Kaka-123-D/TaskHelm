import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  createDatabase,
  DevServerRepository,
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  releasePort,
  removeWorktree,
} from '@taskhelm/core'
import { stopDevServer } from '@taskhelm/supervisor'

type Db = ReturnType<typeof createDatabase>

/**
 * Delete a task and its OS-level resources (running dev server, allocated
 * port, on-disk worktree). Without this cleanup, the next task that wants the
 * same branch name fails on `git worktree add` because the registry still
 * points at the dead worktree.
 *
 * Best-effort: filesystem / signal failures are swallowed so the DB row still
 * gets removed.
 */
export function deleteTaskCascade(db: Db, taskId: string): boolean {
  const taskRepo = new TaskRepository(db)
  const projectRepo = new ProjectRepository(db)
  const devServerRepo = new DevServerRepository(db)
  const subrepoRepo = new TaskSubrepoRepository(db)

  const task = taskRepo.findById(taskId)
  if (!task) return false

  const project = projectRepo.findById(task.project_id)

  // 1. Stop + drop all dev_servers tied to this task (outer + every subrepo
  //    slot). `dev_servers.task_subrepo_id` has no ON DELETE clause, so the
  //    task_subrepos cascade from `taskRepo.delete` below would otherwise be
  //    blocked by any lingering dev_server row.
  for (const server of devServerRepo.findAllByTaskId(taskId)) {
    if (server.status === 'running' || server.status === 'starting') {
      try {
        stopDevServer(db, server.id)
      } catch {
        // ignore
      }
    }
    try {
      devServerRepo.delete(server.id)
    } catch {
      // ignore
    }
  }

  // 2. Remove per-subrepo worktrees that TaskHelm created. Attached subrepos
  //    point at user-managed paths that pre-existed our involvement; never
  //    touch those.
  if (project) {
    for (const subrepo of subrepoRepo.findByTaskId(taskId)) {
      if (
        subrepo.created_by_taskhelm &&
        subrepo.worktree_path &&
        fs.existsSync(subrepo.worktree_path)
      ) {
        const nestedRepoAbsPath = path.join(project.local_repo_root, subrepo.repo_path)
        if (fs.existsSync(path.join(nestedRepoAbsPath, '.git'))) {
          try {
            removeWorktree(nestedRepoAbsPath, subrepo.worktree_path)
          } catch {
            // ignore
          }
        }
      }
    }
  }

  if (task.port != null) {
    try {
      releasePort(db, task.port)
    } catch {
      // ignore
    }
  }

  if (project && task.worktree_path != null && fs.existsSync(task.worktree_path)) {
    try {
      removeWorktree(project.local_repo_root, task.worktree_path)
    } catch {
      // ignore
    }
  }

  // task_subrepos rows cascade automatically once the dev_servers FK
  // references above are gone.
  taskRepo.delete(taskId)
  return true
}
