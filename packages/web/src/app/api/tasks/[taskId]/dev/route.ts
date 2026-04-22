import { NextResponse } from 'next/server'
import {
  ProjectRepository,
  TaskRepository,
  DevServerRepository,
  allocatePort,
  isPortAvailable,
  releasePort,
} from '@taskhelm/core'
import { startDevServer, stopDevServer } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'
import { inspectListeningPort, killExternalProcessForPort } from '@/lib/dev/external-port'

type Params = { params: Promise<{ taskId: string }> }

interface DevRequestBody {
  readonly preferredPort?: number | null
}

interface ExternalStopBody {
  readonly externalPid?: number | null
  readonly externalPort?: number | null
}

/** POST = dev start */
export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const projectRepo = new ProjectRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const project = projectRepo.findById(task.project_id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.dev_command) {
      return NextResponse.json({ error: 'Project has no dev_command configured' }, { status: 400 })
    }

    if (!task.worktree_path) {
      return NextResponse.json(
        { error: 'Task has no worktree. Initialize workspace first.' },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as DevRequestBody
    const requestedPreferredPort =
      body.preferredPort !== undefined ? body.preferredPort : task.preferred_port

    const port =
      requestedPreferredPort != null
        ? (() => {
            const reserved = devServerRepo.findByPort(requestedPreferredPort)
            if (reserved) {
              if (reserved.status !== 'stopped') {
                throw new Error(`Preferred port ${requestedPreferredPort} is not available`)
              }

              // Older TaskHelm versions left stopped dev server rows behind, which
              // still occupy the UNIQUE port key. Reclaim them before starting.
              devServerRepo.delete(reserved.id)
            }
            return requestedPreferredPort
          })()
        : await allocatePort(db, project.id, task.id)

    if (requestedPreferredPort != null) {
      const process = await inspectListeningPort(port)
      if (process) {
        return NextResponse.json(
          {
            error: `Port ${port} is already in use`,
            conflictType: 'external_port_in_use',
            port,
            process,
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

    const devServer = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: project.dev_command,
      cwd: task.worktree_path,
      port,
    })

    taskRepo.update(task.id, {
      preferred_port: requestedPreferredPort ?? null,
      port: devServer.port,
      dev_server_state: 'running',
    })

    return NextResponse.json({
      port: devServer.port,
      pid: devServer.pid,
      serverId: devServer.id,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}

/** DELETE = dev stop */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const devServerRepo = new DevServerRepository(db)
    const body = (await request.json().catch(() => ({}))) as ExternalStopBody

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (body.externalPid != null && body.externalPort != null) {
      const result = await killExternalProcessForPort(body.externalPort, body.externalPid)
      return NextResponse.json({ ...result, external: true })
    }

    const devServer = devServerRepo.findByTaskId(taskId)
    if (!devServer) {
      return NextResponse.json({ error: 'No dev server found for this task' }, { status: 404 })
    }

    stopDevServer(db, devServer.id)

    if (task.port !== null) {
      releasePort(db, task.port)
    }

    taskRepo.update(task.id, {
      port: null,
      dev_server_state: 'stopped',
    })

    return NextResponse.json({ stopped: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
