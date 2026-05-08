import * as fs from 'node:fs'
import {
  createDatabase,
  DevServerRepository,
  ProjectRepository,
  TaskRepository,
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

  const task = taskRepo.findById(taskId)
  if (!task) return false

  const project = projectRepo.findById(task.project_id)

  const devServer = devServerRepo.findByTaskId(taskId)
  if (devServer && devServer.status === 'running') {
    try {
      stopDevServer(db, devServer.id)
    } catch {
      // ignore
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

  taskRepo.delete(taskId)
  return true
}
