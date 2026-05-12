import { NextResponse } from 'next/server'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  DevServerRepository,
  formatBranchName,
  createWorktree,
  listWorktrees,
  removeWorktree,
} from '@taskhelm/core'
import type { TaskSubrepo, DevServerStatusValue } from '@taskhelm/core'
import { stopDevServer } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { discoverSubrepos } from '@/lib/workspace/subrepo-discovery'
import {
  assertSafeBranchName,
  currentBranch,
  listAvailableBaseBranches,
  prepareBranchForWorktree,
  RecoverableBaseBranchError,
} from '@/lib/workspace/base-branch'
import {
  normalizeWorkspaceSubrepoBranches,
  parseWorkspaceSubrepoBranches,
  serializeWorkspaceSubrepoBranches,
  workspaceNameExistsInProject,
} from '@/lib/workspace/runtime-settings'
import { materializeNestedRepoWorktrees } from '@/lib/workspace/nested-worktree'

type Params = { params: Promise<{ taskId: string }> }

interface WorkspaceRequestBody {
  readonly workspaceName?: string
  readonly workspaceBranch?: string
  readonly baseBranch?: string
  readonly autoPullBaseBranch?: boolean
  readonly forceRefreshBaseBranch?: boolean
  readonly subrepoBranches?: readonly { repoPath: string; branch: string }[]
  readonly existingWorktreePath?: string
  /**
   * Per-subrepo attach map. Each entry maps a `repoPath` (must appear in
   * `detectedSubrepos`) to an absolute path of an existing worktree of
   * that nested repo. When provided, the API skips `git worktree add` for
   * that subrepo and instead persists a `task_subrepos` row pointing at
   * the existing on-disk worktree.
   */
  readonly subrepoAttach?: Record<string, string>
  /** Per-subrepo preferred port. Persisted on the task_subrepos row. */
  readonly subrepoPorts?: Record<string, number | null>
  /** Per-subrepo dev_command override. Persisted on the task_subrepos row. */
  readonly subrepoDevCommands?: Record<string, string>
}

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normalizeWorkspacePayload(
  task: ReturnType<TaskRepository['findById']>,
  detectedSubrepos: readonly string[],
  body: WorkspaceRequestBody,
) {
  const workspaceName = trimOrEmpty(body.workspaceName) || trimOrEmpty(task?.workspace_name)
  const workspaceBranch = trimOrEmpty(body.workspaceBranch) || trimOrEmpty(task?.workspace_branch)
  const subrepoBranches = normalizeWorkspaceSubrepoBranches(
    Array.isArray(body.subrepoBranches)
      ? body.subrepoBranches
      : parseWorkspaceSubrepoBranches(task?.workspace_subrepo_branches_json),
    detectedSubrepos,
  )

  return {
    workspaceName,
    workspaceBranch,
    subrepoBranches,
  }
}

interface ExistingWorktreeOption {
  readonly path: string
  readonly name: string
  readonly branch: string
}

function canonicalPath(targetPath: string): string {
  return fs.existsSync(targetPath) ? fs.realpathSync.native(targetPath) : path.resolve(targetPath)
}

function isWithinDir(rootDir: string, candidatePath: string): boolean {
  const relativePath = path.relative(canonicalPath(rootDir), canonicalPath(candidatePath))
  return relativePath.length > 0 && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}

function readWorktreeBranch(worktreePath: string): string {
  return execSync('git branch --show-current', {
    cwd: worktreePath,
    stdio: 'pipe',
  })
    .toString()
    .trim()
}

function getAvailableExistingWorktrees(
  taskRepo: TaskRepository,
  projectId: string,
  currentTaskId: string,
  repoRoot: string,
  worktreeRootDir: string,
): readonly ExistingWorktreeOption[] {
  const assignedPaths = new Set(
    taskRepo
      .findByProjectId(projectId)
      .filter(task => task.id !== currentTaskId && task.worktree_path)
      .map(task => canonicalPath(task.worktree_path!)),
  )

  return listWorktrees(repoRoot)
    .map(worktreePath => canonicalPath(worktreePath))
    .filter(worktreePath => fs.existsSync(worktreePath))
    .filter(worktreePath => isWithinDir(worktreeRootDir, worktreePath))
    .filter(worktreePath => !assignedPaths.has(worktreePath))
    .map(worktreePath => ({
      path: worktreePath,
      name: path.basename(worktreePath),
      branch: readWorktreeBranch(worktreePath),
    }))
}

interface SubrepoState {
  readonly repoPath: string
  readonly id: string | null
  readonly branchName: string | null
  readonly worktreePath: string | null
  readonly preferredPort: number | null
  readonly devCommand: string | null
  readonly devServerState: DevServerStatusValue | null
  readonly availableExistingWorktrees: readonly ExistingWorktreeOption[]
}

/**
 * Build the per-detected-subrepo state array used by the workspace panel.
 * Rows that exist in `task_subrepos` carry their persisted state; detected
 * subrepos without a row are returned uninitialized (all nulls) so the UI
 * can show them as "Configure / Init" candidates.
 *
 * For each detected subrepo we ALSO list `git worktree` entries of that
 * nested repo whose canonical path lives under the project's worktree root
 * but is not yet attached to any task_subrepos row — those are
 * attach-able existing worktrees of that subrepo.
 */
function buildSubrepoStates(
  db: ReturnType<typeof getDb>,
  projectId: string,
  currentTaskId: string,
  repoRoot: string,
  worktreeRootDir: string,
  detectedSubrepos: readonly string[],
): readonly SubrepoState[] {
  const subrepoRepo = new TaskSubrepoRepository(db)
  const currentRows = subrepoRepo.findByTaskId(currentTaskId)
  const rowsByPath = new Map<string, TaskSubrepo>()
  for (const row of currentRows) {
    rowsByPath.set(row.repo_path, row)
  }

  const assignedPathsByRepoPath = new Map<string, Set<string>>()
  for (const repoPath of detectedSubrepos) {
    assignedPathsByRepoPath.set(repoPath, new Set())
  }
  const allRowsThisProject = db
    .prepare(
      `SELECT s.id, s.task_id, s.repo_path, s.worktree_path
       FROM task_subrepos s
       INNER JOIN tasks t ON t.id = s.task_id
       WHERE t.project_id = ?`,
    )
    .all(projectId) as Array<{
      id: string
      task_id: string
      repo_path: string
      worktree_path: string | null
    }>
  for (const row of allRowsThisProject) {
    if (row.task_id === currentTaskId) continue
    if (!row.worktree_path) continue
    const bucket = assignedPathsByRepoPath.get(row.repo_path)
    if (bucket) bucket.add(canonicalPath(row.worktree_path))
  }

  return detectedSubrepos.map(repoPath => {
    const row = rowsByPath.get(repoPath) ?? null
    const nestedAbsPath = path.join(repoRoot, repoPath)

    let candidates: readonly ExistingWorktreeOption[] = []
    if (fs.existsSync(path.join(nestedAbsPath, '.git'))) {
      const assigned = assignedPathsByRepoPath.get(repoPath) ?? new Set<string>()
      candidates = listWorktrees(nestedAbsPath)
        .map(worktreePath => canonicalPath(worktreePath))
        .filter(worktreePath => fs.existsSync(worktreePath))
        .filter(worktreePath => isWithinDir(worktreeRootDir, worktreePath))
        .filter(worktreePath => !assigned.has(worktreePath))
        .filter(worktreePath => worktreePath !== canonicalPath(nestedAbsPath))
        .map(worktreePath => ({
          path: worktreePath,
          name: path.basename(worktreePath),
          branch: readWorktreeBranch(worktreePath),
        }))
    }

    return {
      repoPath,
      id: row?.id ?? null,
      branchName: row?.branch_name ?? null,
      worktreePath: row?.worktree_path ?? null,
      preferredPort: row?.preferred_port ?? null,
      devCommand: row?.dev_command ?? null,
      devServerState: (row?.dev_server_state as DevServerStatusValue | null) ?? null,
      availableExistingWorktrees: candidates,
    }
  })
}

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

    const worktreeRootDir = project.worktree_root ?? path.join(project.local_repo_root, '.worktrees')

    const detectedSubrepos = discoverSubrepos(project.local_repo_root)

    // The outer git calls below are only meaningful for the legacy single-repo
    // flow (project root IS a git repo). In multi-repo mode the workspace
    // root is typically just a container for nested repos — no .git of its
    // own. Make them best-effort so detected subrepos still surface when the
    // outer root isn't a git repo.
    const outerIsGitRepo = fs.existsSync(path.join(project.local_repo_root, '.git'))
    const safeCurrentBranch = outerIsGitRepo
      ? safeCall(() => currentBranch(project.local_repo_root), '')
      : ''
    const safeAvailableBaseBranches = outerIsGitRepo
      ? safeCall(() => listAvailableBaseBranches(project.local_repo_root), [])
      : []
    const safeAvailableExistingWorktrees = outerIsGitRepo
      ? safeCall(
          () =>
            getAvailableExistingWorktrees(
              taskRepo,
              project.id,
              task.id,
              project.local_repo_root,
              worktreeRootDir,
            ),
          [],
        )
      : []

    return NextResponse.json({
      settings: {
        workspaceName: task.workspace_name ?? '',
        workspaceBranch: task.workspace_branch ?? '',
        baseBranch: safeCurrentBranch,
        autoPullBaseBranch: true,
        preferredPort: task.preferred_port,
        subrepoBranches: parseWorkspaceSubrepoBranches(task.workspace_subrepo_branches_json),
      },
      detectedSubrepos,
      availableBaseBranches: safeAvailableBaseBranches,
      availableExistingWorktrees: safeAvailableExistingWorktrees,
      subrepos: buildSubrepoStates(
        db,
        project.id,
        task.id,
        project.local_repo_root,
        worktreeRootDir,
        detectedSubrepos,
      ),
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

function safeCall<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export async function PATCH(request: Request, { params }: Params) {
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

    const detectedSubrepos = discoverSubrepos(project.local_repo_root)
    const body = (await request.json()) as WorkspaceRequestBody
    const normalized = normalizeWorkspacePayload(task, detectedSubrepos, body)

    if (!normalized.workspaceName) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }
    if (normalized.workspaceBranch) {
      assertSafeBranchName(normalized.workspaceBranch)
    }
    if (trimOrEmpty(body.baseBranch)) {
      assertSafeBranchName(trimOrEmpty(body.baseBranch))
    }
    for (const entry of normalized.subrepoBranches) {
      assertSafeBranchName(entry.branch)
    }

    if (
      workspaceNameExistsInProject(
        taskRepo.findByProjectId(project.id),
        normalized.workspaceName,
        task.id,
      )
    ) {
      return NextResponse.json({ error: 'Workspace name already exists in this project' }, { status: 400 })
    }

    const updatedTask = taskRepo.update(task.id, {
      workspace_name: normalized.workspaceName,
      workspace_branch: normalized.workspaceBranch || null,
      workspace_subrepo_branches_json: serializeWorkspaceSubrepoBranches(normalized.subrepoBranches),
    })

    return NextResponse.json({
      settings: {
        workspaceName: updatedTask.workspace_name ?? '',
        workspaceBranch: updatedTask.workspace_branch ?? '',
        baseBranch: trimOrEmpty(body.baseBranch) || currentBranch(project.local_repo_root),
        autoPullBaseBranch: body.autoPullBaseBranch ?? true,
        preferredPort: updatedTask.preferred_port,
        subrepoBranches: parseWorkspaceSubrepoBranches(updatedTask.workspace_subrepo_branches_json),
      },
      detectedSubrepos,
      availableBaseBranches: listAvailableBaseBranches(project.local_repo_root),
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

/** POST = workspace init */
export async function POST(request: Request, { params }: Params) {
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
    const body = (await request.json()) as WorkspaceRequestBody
    const detectedSubrepos = discoverSubrepos(repoRoot)
    const normalized = normalizeWorkspacePayload(task, detectedSubrepos, body)
    const availableExistingWorktrees = getAvailableExistingWorktrees(
      taskRepo,
      project.id,
      task.id,
      repoRoot,
      worktreeRootDir,
    )
    const requestedExistingWorktreePath = trimOrEmpty(body.existingWorktreePath)
    const selectedExistingWorktree =
      requestedExistingWorktreePath
        ? availableExistingWorktrees.find(
            worktree => worktree.path === canonicalPath(requestedExistingWorktreePath),
          )
        : null
    const baseBranch = trimOrEmpty(body.baseBranch) || currentBranch(repoRoot)
    const autoPullBaseBranch = body.autoPullBaseBranch ?? true
    const forceRefreshBaseBranch = body.forceRefreshBaseBranch ?? false
    const workspaceName = normalized.workspaceName || selectedExistingWorktree?.name || ''
    const branchName =
      selectedExistingWorktree?.branch ||
      normalized.workspaceBranch ||
      formatBranchName(pattern, { id: task.id, key: task.key })
    const subrepoBranches = normalized.subrepoBranches

    if (!workspaceName) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }
    assertSafeBranchName(branchName)
    assertSafeBranchName(baseBranch)
    for (const entry of subrepoBranches) {
      assertSafeBranchName(entry.branch)
    }

    if (workspaceNameExistsInProject(taskRepo.findByProjectId(project.id), workspaceName, task.id)) {
      return NextResponse.json({ error: 'Workspace name already exists in this project' }, { status: 400 })
    }

    if (task.worktree_path && fs.existsSync(task.worktree_path)) {
      return NextResponse.json({ error: 'Workspace already initialized for this task' }, { status: 400 })
    }

    if (requestedExistingWorktreePath && !selectedExistingWorktree) {
      return NextResponse.json({ error: 'Selected worktree is not available' }, { status: 400 })
    }

    const worktreePath =
      selectedExistingWorktree?.path ??
      (() => {
        prepareBranchForWorktree({
          repoRoot,
          targetBranch: branchName,
          baseBranch,
          autoPull: autoPullBaseBranch,
          forceRefresh: forceRefreshBaseBranch,
        })

        if (!fs.existsSync(worktreeRootDir)) {
          fs.mkdirSync(worktreeRootDir, { recursive: true })
        }

        return createWorktree({
          repoRoot,
          worktreeRoot: worktreeRootDir,
          branchName,
        })
      })()

    const updatedTask = taskRepo.update(task.id, {
      workspace_name: workspaceName,
      workspace_branch: branchName,
      workspace_subrepo_branches_json: serializeWorkspaceSubrepoBranches(subrepoBranches),
      branch_name: branchName,
      worktree_path: worktreePath,
    })

    if (subrepoBranches.length > 0) {
      const subrepoRepo = new TaskSubrepoRepository(db)
      const subrepoAttach = body.subrepoAttach ?? {}
      const subrepoPorts = body.subrepoPorts ?? {}
      const subrepoDevCommands = body.subrepoDevCommands ?? {}

      for (const entry of subrepoBranches) {
        const nestedRepoAbsPath = path.join(repoRoot, entry.repoPath)
        const attachRequest = trimOrEmpty(subrepoAttach[entry.repoPath])

        let targetWorktreePath: string
        let resolvedBranch = entry.branch
        let createdByTaskhelm = true

        if (attachRequest) {
          const canonicalAttach = canonicalPath(attachRequest)
          if (!fs.existsSync(canonicalAttach)) {
            return NextResponse.json(
              { error: `Attach path does not exist for ${entry.repoPath}: ${canonicalAttach}` },
              { status: 400 },
            )
          }
          const nestedWorktrees = fs.existsSync(path.join(nestedRepoAbsPath, '.git'))
            ? listWorktrees(nestedRepoAbsPath).map(canonicalPath)
            : []
          if (!nestedWorktrees.includes(canonicalAttach)) {
            return NextResponse.json(
              {
                error: `Path is not a registered worktree of ${entry.repoPath}: ${canonicalAttach}`,
              },
              { status: 400 },
            )
          }
          targetWorktreePath = canonicalAttach
          createdByTaskhelm = false
          try {
            const detected = readWorktreeBranch(canonicalAttach)
            if (detected) resolvedBranch = detected
          } catch {
            // ignore — keep the user-provided branch as a fallback
          }
        } else {
          if (!selectedExistingWorktree) {
            // Outer worktree was freshly created above; materialize a nested
            // worktree under it via `git worktree add` against the nested repo.
            materializeNestedRepoWorktrees({
              repoRoot,
              worktreePath,
              nestedRepos: [entry],
            })
          }
          targetWorktreePath = path.join(worktreePath, entry.repoPath)
        }

        const rawPort = subrepoPorts[entry.repoPath]
        const resolvedPort =
          typeof rawPort === 'number' && Number.isFinite(rawPort) && rawPort > 0
            ? Math.trunc(rawPort)
            : null
        const rawDevCommand = subrepoDevCommands[entry.repoPath]
        const resolvedDevCommand =
          typeof rawDevCommand === 'string' && rawDevCommand.trim().length > 0
            ? rawDevCommand.trim()
            : null

        const existing = subrepoRepo.findByTaskIdAndRepoPath(task.id, entry.repoPath)
        if (existing) {
          subrepoRepo.update(existing.id, {
            branch_name: resolvedBranch,
            worktree_path: targetWorktreePath,
            preferred_port: resolvedPort,
            dev_command: resolvedDevCommand,
            created_by_taskhelm: createdByTaskhelm,
          })
        } else {
          subrepoRepo.create({
            task_id: task.id,
            repo_path: entry.repoPath,
            branch_name: resolvedBranch,
            worktree_path: targetWorktreePath,
            preferred_port: resolvedPort,
            dev_command: resolvedDevCommand,
            created_by_taskhelm: createdByTaskhelm,
          })
        }
      }
    }

    return NextResponse.json({
      workspaceName,
      branchName,
      worktreePath,
      subrepoBranches,
      attachedExistingWorktree: selectedExistingWorktree != null,
      task: updatedTask,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof RecoverableBaseBranchError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        recoverable: true,
        canForceRefresh: error.canForceRefresh,
      }, { status: 400 })
    }
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

    const subrepoRepo = new TaskSubrepoRepository(db)
    const devServerRepo = new DevServerRepository(db)
    const subrepoRows = subrepoRepo.findByTaskId(task.id)
    for (const row of subrepoRows) {
      // Drop dev_servers rows first — they FK-reference task_subrepos.id
      // and would block the cascade delete below.
      const server = devServerRepo.findByTaskSubrepoId(row.id)
      if (server) {
        try {
          if (server.status === 'running' || server.status === 'starting') {
            stopDevServer(db, server.id)
          }
        } catch {
          // ignore
        }
        devServerRepo.delete(server.id)
      }
      // Never destroy a worktree the user pointed us at via attach — that
      // path pre-existed our involvement and removing it would silently
      // delete their on-disk state.
      if (!row.created_by_taskhelm) continue
      if (row.worktree_path && fs.existsSync(row.worktree_path)) {
        try {
          const nestedRepoAbsPath = path.join(project.local_repo_root, row.repo_path)
          if (fs.existsSync(path.join(nestedRepoAbsPath, '.git'))) {
            removeWorktree(nestedRepoAbsPath, row.worktree_path)
          }
        } catch {
          // Best-effort — registry may already be clean. Continue cleanup so
          // we don't leave dangling task_subrepos rows.
        }
      }
    }
    subrepoRepo.deleteByTaskId(task.id)

    if (task.worktree_path && fs.existsSync(task.worktree_path)) {
      removeWorktree(project.local_repo_root, task.worktree_path)
    }

    taskRepo.update(task.id, {
      branch_name: null,
      worktree_path: null,
      port: null,
      dev_server_state: 'stopped',
    })

    return NextResponse.json({ cleaned: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
