import { NextResponse } from 'next/server'
import {
  ProjectRepository,
  TaskRepository,
  DevServerRepository,
  allocatePort,
  releasePort,
} from '@taskhelm/core'
import { startDevServer, stopDevServer } from '@taskhelm/supervisor'
import { getDb } from '@/lib/db'

type Params = { params: Promise<{ taskId: string }> }

/** POST = dev start */
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

    if (!project.dev_command) {
      return NextResponse.json({ error: 'Project has no dev_command configured' }, { status: 400 })
    }

    if (!task.worktree_path) {
      return NextResponse.json(
        { error: 'Task has no worktree. Initialize workspace first.' },
        { status: 400 }
      )
    }

    const port = await allocatePort(db, project.id, task.id)

    const devServer = startDevServer({
      db,
      projectId: project.id,
      taskId: task.id,
      devCommand: project.dev_command,
      cwd: task.worktree_path,
      port,
    })

    taskRepo.update(task.id, {
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
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const db = getDb()
    const taskRepo = new TaskRepository(db)
    const devServerRepo = new DevServerRepository(db)

    const task = taskRepo.findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
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
      port: undefined,
      dev_server_state: 'stopped',
    })

    return NextResponse.json({ stopped: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
