import { NextResponse } from 'next/server'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  DevServerRepository,
  removeWorktree,
} from '@taskhelm/core'
import { stopDevServer } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { assertSafeBranchName } from '@/lib/workspace/base-branch'

type Params = { params: Promise<{ taskId: string; subrepoId: string }> }

interface PatchSubrepoBody {
  readonly branch?: string
  readonly preferredPort?: number | null
  readonly devCommand?: string | null
}

/** PATCH = update a subrepo's settings (no git ops — settings only). */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { taskId, subrepoId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const subrepoRepo = new TaskSubrepoRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const subrepo = subrepoRepo.findById(subrepoId)
    if (!subrepo || subrepo.task_id !== task.id) {
      return NextResponse.json({ error: 'Subrepo not found for this task' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as PatchSubrepoBody
    const branch = body.branch?.trim()
    if (branch && branch !== subrepo.branch_name) {
      assertSafeBranchName(branch)
    }

    const port =
      body.preferredPort === undefined
        ? undefined
        : typeof body.preferredPort === 'number' && Number.isFinite(body.preferredPort) && body.preferredPort > 0
          ? Math.trunc(body.preferredPort)
          : null

    const devCommand =
      body.devCommand === undefined
        ? undefined
        : typeof body.devCommand === 'string' && body.devCommand.trim().length > 0
          ? body.devCommand.trim()
          : null

    const updated = subrepoRepo.update(subrepo.id, {
      ...(branch !== undefined ? { branch_name: branch || subrepo.branch_name } : {}),
      ...(port !== undefined ? { preferred_port: port } : {}),
      ...(devCommand !== undefined ? { dev_command: devCommand } : {}),
    })

    return NextResponse.json({ subrepo: updated })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

/** DELETE = cleanup a single subrepo. Removes its worktree (only when
 *  TaskHelm created it) and deletes the task_subrepos row. Any running
 *  dev server is stopped first.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { taskId, subrepoId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const projectRepo = new ProjectRepository(db)
    const subrepoRepo = new TaskSubrepoRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const subrepo = subrepoRepo.findById(subrepoId)
    if (!subrepo || subrepo.task_id !== task.id) {
      return NextResponse.json({ error: 'Subrepo not found for this task' }, { status: 404 })
    }

    const project = projectRepo.findById(task.project_id)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const server = devServerRepo.findByTaskSubrepoId(subrepo.id)
    if (server) {
      try {
        stopDevServer(db, server.id)
      } catch {
        // ignore — proceeding to cleanup the row regardless
      }
      // Drop the dev_servers row too — otherwise its task_subrepo_id FK
      // would block subrepoRepo.delete() below.
      devServerRepo.delete(server.id)
    }

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
          // best-effort
        }
      }
    }

    subrepoRepo.delete(subrepo.id)

    return NextResponse.json({ cleaned: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
