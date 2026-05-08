import type { Command } from 'commander'
import * as fs from 'node:fs'
import { spawn } from 'node:child_process'
import chalk from 'chalk'
import Table from 'cli-table3'
import {
  ProjectRepository,
  TaskRepository,
  DevServerRepository,
  allocatePort,
  isPortAvailable,
  releasePort,
} from '@taskhelm/core'
import {
  startDevServerWithDiagnostics,
  stopDevServer,
  getPoolStatus,
} from '@taskhelm/supervisor'
import { getDb } from '../db.js'
import { resolveTaskOrExit } from '../resolver.js'

// Statuses that mean the row no longer holds the port: the process exited or
// never came up. The UNIQUE port key would otherwise block a fresh start.
const RECLAIMABLE_STATUSES = new Set(['stopped', 'failed'])

function parsePortFlag(raw: string): number {
  const port = Number.parseInt(raw, 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${raw}`)
  }
  return port
}

export function registerDevCommands(program: Command): void {
  const devCmd = program.command('dev').description('Manage dev servers for tasks')

  devCmd
    .command('start <taskId>')
    .description('Start a dev server for a task')
    .option('--port <port>', 'Use this exact port instead of auto-allocating', parsePortFlag)
    .option('--command <cmd>', 'Override the project dev_command for this run only')
    .action(async (taskId: string, opts: { port?: number; command?: string }) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const projectRepo = new ProjectRepository(db)
        const devServerRepo = new DevServerRepository(db)

        const task = resolveTaskOrExit(db, taskId)

        const project = projectRepo.findById(task.project_id)
        if (!project) {
          console.error(chalk.red(`Project not found: ${task.project_id}`))
          process.exit(1)
        }

        const devCommand = opts.command ?? project.dev_command
        if (!devCommand) {
          console.error(
            chalk.red('No dev command available. Configure project.dev_command or pass --command.')
          )
          process.exit(1)
        }

        if (!task.worktree_path) {
          console.error(
            chalk.red('Task has no worktree_path. Run `workspace init <taskId>` first.')
          )
          process.exit(1)
        }

        let port: number
        if (opts.port != null) {
          // Mirror the API route: reclaim a stale row holding this port, then
          // verify the OS-level port is free before spawning.
          const reserved = devServerRepo.findByPort(opts.port)
          if (reserved) {
            if (!RECLAIMABLE_STATUSES.has(reserved.status)) {
              throw new Error(`Port ${opts.port} is already in use by another dev server`)
            }
            devServerRepo.delete(reserved.id)
          }
          const available = await isPortAvailable(opts.port)
          if (!available) {
            throw new Error(`Port ${opts.port} is already in use on the host`)
          }
          port = opts.port
        } else {
          port = await allocatePort(db, project.id, task.id)
        }

        const { devServer, errorMessage } = await startDevServerWithDiagnostics({
          db,
          projectId: project.id,
          taskId: task.id,
          devCommand,
          cwd: task.worktree_path,
          port,
        })

        taskRepo.update(task.id, {
          port: devServer.status === 'failed' ? undefined : devServer.port,
          dev_server_state: devServer.status,
        })

        if (devServer.status === 'failed') {
          console.error(chalk.red('Dev server failed to start'))
          if (errorMessage) console.error(errorMessage)
          if (devServer.log_path) {
            console.error(chalk.gray(`Log: ${devServer.log_path}`))
          }
          process.exit(1)
        }

        console.log(chalk.green(`Dev server started on port ${devServer.port}`))
        console.log(`  PID:    ${chalk.cyan(String(devServer.pid ?? 'unknown'))}`)
        console.log(`  Server: ${chalk.cyan(devServer.id)}`)
        if (devServer.log_path) {
          console.log(`  Log:    ${chalk.gray(devServer.log_path)}`)
        }
      } catch (error) {
        console.error(chalk.red('Error starting dev server:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  devCmd
    .command('stop <taskId>')
    .description('Stop the dev server for a task')
    .action((taskId: string) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const devServerRepo = new DevServerRepository(db)

        const task = resolveTaskOrExit(db, taskId)

        const devServer = devServerRepo.findByTaskId(task.id)
        if (!devServer) {
          console.error(chalk.red('No dev server found for this task'))
          process.exit(1)
        }

        stopDevServer(db, devServer.id)

        if (task.port !== null) {
          releasePort(db, task.port)
        }

        taskRepo.update(task.id, {
          port: undefined,
          dev_server_state: 'stopped',
        })

        console.log(chalk.green('Dev server stopped'))
      } catch (error) {
        console.error(chalk.red('Error stopping dev server:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  devCmd
    .command('logs <taskId>')
    .description('Print the dev server log path (and optionally tail it) for a task')
    .option('-f, --follow', 'Follow the log file (tail -f)')
    .option('-n, --lines <count>', 'Print the last N lines before exiting / following', '50')
    .action(async (taskId: string, opts: { follow?: boolean; lines: string }) => {
      const db = getDb()
      try {
        const devServerRepo = new DevServerRepository(db)
        const task = resolveTaskOrExit(db, taskId)

        const devServer = devServerRepo.findByTaskId(task.id)
        if (!devServer) {
          console.error(chalk.red('No dev server has ever been started for this task'))
          process.exit(1)
        }

        if (!devServer.log_path) {
          console.error(
            chalk.yellow(
              'Dev server has no log_path recorded (started before v0.1.14). Restart it to capture logs.'
            )
          )
          process.exit(1)
        }

        if (!fs.existsSync(devServer.log_path)) {
          console.error(chalk.red(`Log file missing on disk: ${devServer.log_path}`))
          process.exit(1)
        }

        console.log(chalk.dim(`Log: ${devServer.log_path}`))

        // Close the DB before exec'ing tail so locks aren't held during a long
        // follow session.
        db.close()

        const lineCount = Number.parseInt(opts.lines, 10)
        const lines = Number.isFinite(lineCount) && lineCount > 0 ? String(lineCount) : '50'

        const tailArgs = ['-n', lines]
        if (opts.follow) tailArgs.push('-f')
        tailArgs.push(devServer.log_path)

        const child = spawn('tail', tailArgs, { stdio: 'inherit' })
        child.on('exit', code => {
          process.exit(code ?? 0)
        })
        child.on('error', err => {
          console.error(chalk.red('Failed to spawn `tail`:'), err.message)
          process.exit(1)
        })
      } catch (error) {
        console.error(chalk.red('Error reading dev server logs:'), (error as Error).message)
        process.exit(1)
      }
    })

  devCmd
    .command('pool')
    .description('Show dev server pool status')
    .option('--project <slug>', 'Filter by project slug')
    .action((opts: { project?: string }) => {
      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const taskRepo = new TaskRepository(db)

        let projectIds: string[]

        if (opts.project) {
          const project = projectRepo.findBySlug(opts.project)
          if (!project) {
            console.error(chalk.red(`Project not found: ${opts.project}`))
            process.exit(1)
          }
          projectIds = [project.id]
        } else {
          const projects = projectRepo.findAll()
          projectIds = projects.map((p) => p.id)
        }

        const table = new Table({
          head: ['project', 'task', 'port', 'pid', 'status', 'started_at'],
        })

        for (const projectId of projectIds) {
          const project = projectRepo.findById(projectId)
          if (!project) continue

          const { servers } = getPoolStatus(db, projectId)

          for (const server of servers) {
            const task = server.task_id ? taskRepo.findById(server.task_id) : null
            table.push([
              project.slug,
              task ? task.title : server.task_id ?? '-',
              String(server.port),
              server.pid !== null ? String(server.pid) : '-',
              server.status,
              server.started_at ?? '-',
            ])
          }
        }

        console.log(table.toString())
      } catch (error) {
        console.error(chalk.red('Error fetching pool status:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })
}
