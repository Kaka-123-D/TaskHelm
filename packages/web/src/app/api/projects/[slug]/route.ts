import { NextResponse } from 'next/server'
import * as fs from 'node:fs'
import {
  DevServerRepository,
  ProjectRepository,
  TaskRepository,
  removeWorktree,
} from '@taskhelm/core'
import { stopDevServer } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ slug: string }> }

function deleteByIds(db: ReturnType<typeof getDb>, table: string, column: string, ids: readonly string[]) {
  if (ids.length === 0) return
  const placeholders = ids.map(() => '?').join(', ')
  db.prepare(`DELETE FROM ${table} WHERE ${column} IN (${placeholders})`).run(...ids)
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params
    const db = getDb()
    const projectRepo = new ProjectRepository(db)
    const taskRepo = new TaskRepository(db)

    const project = projectRepo.findBySlug(slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const tasks = taskRepo.findByProjectId(project.id)
    const result = {
      ...project,
      taskCount: tasks.length,
      activeTaskCount: tasks.filter(t => t.port != null).length,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/projects/[slug] failed:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { slug } = await params
    const db = getDb()
    const projectRepo = new ProjectRepository(db)

    const project = projectRepo.findBySlug(slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const updated = projectRepo.update(project.id, body)
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { slug } = await params
    const db = getDb()
    const projectRepo = new ProjectRepository(db)
    const taskRepo = new TaskRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const project = projectRepo.findBySlug(slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Best-effort cleanup of OS-level state (running children, on-disk worktrees)
    // BEFORE the DB cascade. We do this outside the SQLite transaction because
    // these calls touch external state (signals, filesystem, git) that can't
    // be rolled back if the transaction aborts.
    const tasks = taskRepo.findByProjectId(project.id)
    for (const task of tasks) {
      const devServer = devServerRepo.findByTaskId(task.id)
      if (devServer && devServer.status === 'running') {
        try {
          stopDevServer(db, devServer.id)
        } catch {
          // ignore — keep going
        }
      }
      if (task.worktree_path != null && fs.existsSync(task.worktree_path)) {
        try {
          removeWorktree(project.local_repo_root, task.worktree_path)
        } catch {
          // ignore — keep going
        }
      }
    }

    const deleteProjectCascade = db.transaction((projectId: string) => {
      const taskIds = (
        db.prepare('SELECT id FROM tasks WHERE project_id = ?').all(projectId) as Array<{ id: string }>
      ).map(row => row.id)

      if (taskIds.length > 0) {
        deleteByIds(db, 'notifications', 'task_id', taskIds)
        const taskPlaceholders = taskIds.map(() => '?').join(', ')
        db.prepare(
          `DELETE FROM events WHERE entity_type = 'task' AND entity_id IN (${taskPlaceholders})`,
        ).run(...taskIds)
      }

      db.prepare('DELETE FROM dev_servers WHERE project_id = ?').run(projectId)
      db.prepare('DELETE FROM notifications WHERE project_id = ?').run(projectId)
      db.prepare("DELETE FROM events WHERE entity_type = 'project' AND entity_id = ?").run(projectId)
      db.prepare('DELETE FROM tasks WHERE project_id = ?').run(projectId)
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
    })

    deleteProjectCascade(project.id)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
