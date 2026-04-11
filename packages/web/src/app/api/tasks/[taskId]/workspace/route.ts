import { NextResponse } from 'next/server'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  ProjectRepository,
  TaskRepository,
  writeCapsule,
  formatBranchName,
  createBranch,
  branchExists,
  createWorktree,
  removeWorktree,
} from '@taskhelm/core'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

/** POST = workspace init */
export async function POST(_request: Request, { params }: Params) {
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

    const repoRoot = project.local_repo_root
    const pattern = project.branch_naming_pattern ?? 'task/{id}'
    const worktreeRootDir = project.worktree_root ?? path.join(repoRoot, '.worktrees')

    const branchName = formatBranchName(pattern, { id: task.id, key: task.key })

    if (!branchExists(repoRoot, branchName)) {
      createBranch(repoRoot, branchName)
    }

    if (!fs.existsSync(worktreeRootDir)) {
      fs.mkdirSync(worktreeRootDir, { recursive: true })
    }

    const worktreePath = createWorktree({
      repoRoot,
      worktreeRoot: worktreeRootDir,
      branchName,
    })

    const updatedTask = taskRepo.update(task.id, {
      branch_name: branchName,
      worktree_path: worktreePath,
    })

    writeCapsule({
      baseDir: repoRoot,
      projectSlug: project.slug,
      task: updatedTask,
      project,
    })

    return NextResponse.json({
      branchName,
      worktreePath,
      task: updatedTask,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

/** DELETE = workspace cleanup */
export async function DELETE(_request: Request, { params }: Params) {
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

    if (task.worktree_path && fs.existsSync(task.worktree_path)) {
      removeWorktree(project.local_repo_root, task.worktree_path)
    }

    taskRepo.update(task.id, {
      branch_name: null,
      worktree_path: null,
    })

    return NextResponse.json({ cleaned: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
