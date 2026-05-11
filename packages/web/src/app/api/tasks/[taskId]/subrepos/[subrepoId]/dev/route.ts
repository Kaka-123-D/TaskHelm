import { NextResponse } from 'next/server'
import {
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  DevServerRepository,
  allocatePort,
  isPortAvailable,
  releasePort,
} from '@taskhelm/core'
import { startDevServerWithDiagnostics, stopDevServer } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { inspectListeningPort } from '@/lib/dev/external-port'

type Params = { params: Promise<{ taskId: string; subrepoId: string }> }

interface SubrepoDevRequestBody {
  readonly preferredPort?: number | null
  readonly devCommand?: string | null
}

const RECLAIMABLE_STATUSES = new Set(['stopped', 'failed'])

/** POST = start dev server for one nested-repo slot of a task. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId, subrepoId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const projectRepo = new ProjectRepository(db)
    const subrepoRepo = new TaskSubrepoRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const subrepo = subrepoRepo.findById(subrepoId)
    if (!subrepo || subrepo.task_id !== task.id) {
      return NextResponse.json({ error: 'Subrepo not found for this task' }, { status: 404 })
    }

    const project = projectRepo.findById(task.project_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!subrepo.worktree_path) {
      return NextResponse.json(
        { error: 'Subrepo has no worktree. Initialize it first.' },
        { status: 400 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as SubrepoDevRequestBody
    const devCommand =
      body.devCommand?.trim() || subrepo.dev_command?.trim() || project.dev_command?.trim()
    if (!devCommand) {
      return NextResponse.json(
        { error: 'No dev_command configured for subrepo or project' },
        { status: 400 },
      )
    }

    const existingForSubrepo = devServerRepo.findByTaskSubrepoId(subrepo.id)
    if (existingForSubrepo && !RECLAIMABLE_STATUSES.has(existingForSubrepo.status)) {
      return NextResponse.json(
        { error: `Dev server already ${existingForSubrepo.status} for this subrepo`, serverId: existingForSubrepo.id },
        { status: 409 },
      )
    }
    if (existingForSubrepo) {
      devServerRepo.delete(existingForSubrepo.id)
    }

    const requestedPreferredPort =
      body.preferredPort !== undefined ? body.preferredPort : subrepo.preferred_port

    const port =
      requestedPreferredPort != null
        ? (() => {
            const reserved = devServerRepo.findByPort(requestedPreferredPort)
            if (reserved) {
              if (!RECLAIMABLE_STATUSES.has(reserved.status)) {
                throw new Error(`Preferred port ${requestedPreferredPort} is not available`)
              }
              devServerRepo.delete(reserved.id)
            }
            return requestedPreferredPort
          })()
        : await allocatePort(db, project.id, task.id)

    if (requestedPreferredPort != null) {
      const proc = await inspectListeningPort(port)
      if (proc) {
        return NextResponse.json(
          {
            error: `Port ${port} is already in use`,
            conflictType: 'external_port_in_use',
            port,
            process: proc,
          },
          { status: 409 },
        )
      }

      const available = await isPortAvailable(port)
      if (!available) {
        return NextResponse.json(
          {
            error: `Port ${port} is already in use`,
            conflictType: 'external_port_in_use',
            port,
            process: null,
          },
          { status: 409 },
        )
      }
    }

    const { devServer, errorMessage } = await startDevServerWithDiagnostics({
      db,
      projectId: project.id,
      taskId: task.id,
      taskSubrepoId: subrepo.id,
      devCommand,
      cwd: subrepo.worktree_path,
      port,
    })

    subrepoRepo.update(subrepo.id, {
      preferred_port: requestedPreferredPort ?? null,
      dev_command: body.devCommand?.trim() || subrepo.dev_command,
      dev_server_state: devServer.status,
    })

    if (devServer.status === 'failed') {
      return NextResponse.json(
        {
          error: errorMessage ?? 'Dev server failed to start',
          serverId: devServer.id,
          logPath: devServer.log_path,
          port: devServer.port,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        port: devServer.port,
        pid: devServer.pid,
        serverId: devServer.id,
        logPath: devServer.log_path,
        subrepoId: subrepo.id,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

/** DELETE = stop dev server for one nested-repo slot. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { taskId, subrepoId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const subrepoRepo = new TaskSubrepoRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const subrepo = subrepoRepo.findById(subrepoId)
    if (!subrepo || subrepo.task_id !== task.id) {
      return NextResponse.json({ error: 'Subrepo not found for this task' }, { status: 404 })
    }

    const server = devServerRepo.findByTaskSubrepoId(subrepo.id)
    if (!server) {
      return NextResponse.json({ error: 'No dev server found for this subrepo' }, { status: 404 })
    }

    stopDevServer(db, server.id)

    if (server.port !== null) {
      releasePort(db, server.port)
    }

    subrepoRepo.update(subrepo.id, { dev_server_state: 'stopped' })

    return NextResponse.json({ stopped: true, subrepoId: subrepo.id })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
