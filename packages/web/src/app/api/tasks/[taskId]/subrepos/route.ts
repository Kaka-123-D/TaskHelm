import { NextResponse } from 'next/server'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  canonicalWorktreePath,
  listWorktrees,
} from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { discoverSubrepos } from '@/lib/workspace/subrepo-discovery'
import {
  assertSafeBranchName,
  currentBranch,
  prepareBranchForWorktree,
  RecoverableBaseBranchError,
} from '@/lib/workspace/base-branch'
import { createSubrepoWorktree } from '@/lib/workspace/nested-worktree'

type Params = { params: Promise<{ taskId: string }> }

interface InitSubrepoBody {
  readonly repoPath?: string
  readonly branch?: string
  readonly baseBranch?: string
  readonly autoPullBaseBranch?: boolean
  readonly preferredPort?: number | null
  readonly devCommand?: string | null
  readonly existingWorktreePath?: string
}

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function readWorktreeBranch(worktreePath: string): string {
  return execSync('git branch --show-current', { cwd: worktreePath, stdio: 'pipe' })
    .toString()
    .trim()
}

/**
 * POST = initialize a single subrepo for a task. Creates or attaches the
 * nested-repo worktree and persists the matching `task_subrepos` row.
 * The outer task worktree does NOT need to exist first — subrepos are
 * independent of the outer worktree in the multi-repo model.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const projectRepo = new ProjectRepository(db)
    const subrepoRepo = new TaskSubrepoRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const project = projectRepo.findById(task.project_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as InitSubrepoBody
    const repoPath = trimOrEmpty(body.repoPath)
    if (!repoPath) {
      return NextResponse.json({ error: 'repoPath is required' }, { status: 400 })
    }

    const detected = discoverSubrepos(project.local_repo_root)
    if (!detected.includes(repoPath)) {
      return NextResponse.json(
        { error: `repoPath "${repoPath}" is not a detected nested repo of the project` },
        { status: 400 },
      )
    }

    const nestedRepoAbsPath = path.join(project.local_repo_root, repoPath)
    const worktreeRootDir =
      project.worktree_root ?? path.join(project.local_repo_root, '.worktrees')
    const taskScopedRoot = path.join(worktreeRootDir, task.key ?? task.id)
    const attachRequest = trimOrEmpty(body.existingWorktreePath)

    const existingRow = subrepoRepo.findByTaskIdAndRepoPath(task.id, repoPath)
    if (existingRow && existingRow.worktree_path && fs.existsSync(existingRow.worktree_path)) {
      return NextResponse.json(
        { error: `Subrepo "${repoPath}" is already initialized for this task` },
        { status: 400 },
      )
    }

    const preferredPort =
      typeof body.preferredPort === 'number' && Number.isFinite(body.preferredPort) && body.preferredPort > 0
        ? Math.trunc(body.preferredPort)
        : null
    const devCommand =
      typeof body.devCommand === 'string' && body.devCommand.trim().length > 0
        ? body.devCommand.trim()
        : null

    let targetWorktreePath: string
    let resolvedBranch = trimOrEmpty(body.branch)
    let createdByTaskhelm = true

    if (attachRequest) {
      const canonicalAttach = canonicalWorktreePath(attachRequest)
      if (!fs.existsSync(canonicalAttach)) {
        return NextResponse.json(
          { error: `Attach path does not exist: ${canonicalAttach}` },
          { status: 400 },
        )
      }
      const nestedWorktrees = fs.existsSync(path.join(nestedRepoAbsPath, '.git'))
        ? listWorktrees(nestedRepoAbsPath).map(canonicalWorktreePath)
        : []
      if (!nestedWorktrees.includes(canonicalAttach)) {
        return NextResponse.json(
          { error: `Path is not a registered worktree of ${repoPath}: ${canonicalAttach}` },
          { status: 400 },
        )
      }
      targetWorktreePath = canonicalAttach
      createdByTaskhelm = false
      try {
        const detectedBranch = readWorktreeBranch(canonicalAttach)
        if (detectedBranch) resolvedBranch = detectedBranch
      } catch {
        // keep user-provided branch as fallback
      }
    } else {
      if (!resolvedBranch) {
        return NextResponse.json({ error: 'branch is required when not attaching' }, { status: 400 })
      }
      assertSafeBranchName(resolvedBranch)

      const baseBranch = trimOrEmpty(body.baseBranch) || currentBranch(nestedRepoAbsPath)
      const autoPullBaseBranch = body.autoPullBaseBranch ?? false

      fs.mkdirSync(taskScopedRoot, { recursive: true })
      targetWorktreePath = createSubrepoWorktree({
        nestedRepoAbsPath,
        targetPath: path.join(taskScopedRoot, path.basename(repoPath)),
        branchName: resolvedBranch,
        baseBranch,
        autoPull: autoPullBaseBranch,
      })
    }

    const persisted = existingRow
      ? subrepoRepo.update(existingRow.id, {
          branch_name: resolvedBranch,
          worktree_path: targetWorktreePath,
          preferred_port: preferredPort,
          dev_command: devCommand,
          created_by_taskhelm: createdByTaskhelm,
        })
      : subrepoRepo.create({
          task_id: task.id,
          repo_path: repoPath,
          branch_name: resolvedBranch,
          worktree_path: targetWorktreePath,
          preferred_port: preferredPort,
          dev_command: devCommand,
          created_by_taskhelm: createdByTaskhelm,
        })

    return NextResponse.json({ subrepo: persisted }, { status: 201 })
  } catch (error) {
    if (error instanceof RecoverableBaseBranchError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          recoverable: true,
          canForceRefresh: error.canForceRefresh,
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
