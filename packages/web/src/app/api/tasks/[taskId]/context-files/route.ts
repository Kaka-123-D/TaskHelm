import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import * as fs from 'node:fs'
import * as path from 'node:path'

type Params = { params: Promise<{ taskId: string }> }

const CONTEXT_FILES = ['context.md', 'plan.md', 'handoff.md', 'review.md'] as const

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const projectRepo = new ProjectRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const project = projectRepo.findById(task.project_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const capsuleDir = path.join(
      project.local_repo_root,
      'projects',
      project.slug,
      'tasks',
      task.id
    )

    const files = CONTEXT_FILES.map(filename => {
      const filePath = path.join(capsuleDir, filename)
      const exists = fs.existsSync(filePath)
      return {
        name: filename,
        path: filePath,
        exists,
        content: exists ? fs.readFileSync(filePath, 'utf-8') : null,
      }
    }).filter(f => f.exists)

    return NextResponse.json({
      capsuleDir,
      files,
      specdownUsername: project.specdown_project_ref?.split('/')[0] ?? null,
      specdownSlug: project.specdown_project_ref?.split('/')[1] ?? null,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
