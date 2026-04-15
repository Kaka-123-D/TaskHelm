import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
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

    const project = projectRepo.findBySlug(slug)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const deleteProjectCascade = db.transaction((projectId: string) => {
      const taskIds = (
        db.prepare('SELECT id FROM tasks WHERE project_id = ?').all(projectId) as Array<{ id: string }>
      ).map(row => row.id)

      deleteByIds(db, 'agent_runs', 'task_id', taskIds)
      deleteByIds(db, 'review_gates', 'task_id', taskIds)

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
