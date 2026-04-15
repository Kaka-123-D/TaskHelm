import { NextResponse } from 'next/server'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { resolveContextVault } from '@/lib/context-vault/persisted-vault'

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

    const persistedVault = resolveContextVault(task)
    if (persistedVault.files.length > 0) {
      return NextResponse.json({
        capsuleDir: persistedVault.rootPath,
        files: persistedVault.files.map(file => ({
          name: file.relativePath,
          path: file.absolutePath,
          exists: true,
          content: file.content,
        })),
      })
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
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
