import type { Command } from 'commander'
import * as fs from 'node:fs'
import { spawn } from 'node:child_process'
import chalk from 'chalk'
import Table from 'cli-table3'
import {
  ProjectRepository,
  TaskRepository,
  TaskSubrepoRepository,
  DevServerRepository,
  allocatePort,
  isPortAvailable,
  releasePort,
} from '@taskhelm/core'
import type { Task, TaskSubrepo } from '@taskhelm/core'
import type Database from 'better-sqlite3'
import {
  startDevServerWithDiagnostics,
  stopDevServer,
  getPoolStatus,
} from '@taskhelm/supervisor'
import { getDb } from '../db.js'
import { resolveTaskOrExit, resolveTaskSubrepoOrExit } from '../resolver.js'

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

interface StartOneTargetOptions {
  readonly port?: number
  readonly command?: string
}

/** Start one dev server for either the outer-repo or a single subrepo target. */
async function startOneTarget(
  db: Database.Database,
  project: { id: string; dev_command: string | null },
  task: Task,
  subrepo: TaskSubrepo | null,
  opts: StartOneTargetOptions,
) {
  const devServerRepo = new DevServerRepository(db)
  const taskRepo = new TaskRepository(db)
  const subrepoRepo = new TaskSubrepoRepository(db)

  const cwd = subrepo ? subrepo.worktree_path : task.worktree_path
  if (!cwd) {
    throw new Error(
      subrepo
        ? `Subrepo "${subrepo.repo_path}" has no worktree_path. Initialize it first.`
        : 'Task has no worktree_path. Run `workspace init <taskId>` first.',
    )
  }

  const devCommand =
    opts.command ?? subrepo?.dev_command ?? project.dev_command ?? null
  if (!devCommand) {
    throw new Error(
      'No dev command available. Configure project.dev_command, set the subrepo override, or pass --command.',
    )
  }

  const preferredPort =
    opts.port ?? (subrepo ? subrepo.preferred_port : task.preferred_port) ?? null

  let port: number
  if (preferredPort != null) {
    const reserved = devServerRepo.findByPort(preferredPort)
    if (reserved) {
      if (!RECLAIMABLE_STATUSES.has(reserved.status)) {
        throw new Error(`Port ${preferredPort} is already in use by another dev server`)
      }
      devServerRepo.delete(reserved.id)
    }
    const available = await isPortAvailable(preferredPort)
    if (!available) {
      throw new Error(`Port ${preferredPort} is already in use on the host`)
    }
    port = preferredPort
  } else {
    port = await allocatePort(db, project.id, task.id)
  }

  const { devServer, errorMessage } = await startDevServerWithDiagnostics({
    db,
    projectId: project.id,
    taskId: task.id,
    taskSubrepoId: subrepo?.id,
    devCommand,
    cwd,
    port,
  })

  if (subrepo) {
    subrepoRepo.update(subrepo.id, {
      preferred_port: opts.port ?? subrepo.preferred_port ?? null,
      dev_command: opts.command ?? subrepo.dev_command,
      dev_server_state: devServer.status,
    })
  } else {
    taskRepo.update(task.id, {
      port: devServer.status === 'failed' ? undefined : devServer.port,
      dev_server_state: devServer.status,
    })
  }

  if (devServer.status === 'failed') {
    const fail = new Error(errorMessage ?? 'Dev server failed to start')
    if (devServer.log_path) {
      ;(fail as Error & { logPath?: string }).logPath = devServer.log_path
    }
    throw fail
  }

  return { devServer }
}

/**
 * Decide which target rows a dev sub-command should operate on for a task.
 * Returns either the outer-repo target (subrepo: null) or one row per
 * configured subrepo. Exits 1 when ambiguous: a task with ≥1 subrepo rows
 * but neither --subrepo nor --all-subrepos passed.
 */
type DevTarget = { readonly subrepo: TaskSubrepo | null }

function resolveDevTargets(
  db: Database.Database,
  task: Task,
  opts: { subrepo?: string; allSubrepos?: boolean },
): readonly DevTarget[] {
  const subrepoRepo = new TaskSubrepoRepository(db)
  const subrepos = subrepoRepo.findByTaskId(task.id)

  if (opts.subrepo != null) {
    const sub = resolveTaskSubrepoOrExit(db, task, opts.subrepo)
    return [{ subrepo: sub }]
  }

  if (opts.allSubrepos) {
    if (subrepos.length === 0) {
      console.error(chalk.red('--all-subrepos passed but this task has no subrepos configured'))
      process.exit(1)
    }
    return subrepos.map(sub => ({ subrepo: sub }))
  }

  if (subrepos.length > 0) {
    console.error(
      chalk.red(
        `Task has ${subrepos.length} subrepo(s) configured — pass --subrepo <repoPath> or --all-subrepos`,
      ),
    )
    console.error(chalk.dim('Configured subrepos:'))
    for (const row of subrepos) {
      console.error(chalk.dim(`  - ${row.repo_path}`))
    }
    process.exit(1)
  }

  return [{ subrepo: null }]
}

export function registerDevCommands(program: Command): void {
  const devCmd = program.command('dev').description('Manage dev servers for tasks')

  devCmd
    .command('start <taskId>')
    .description('Start a dev server for a task (or one of its subrepos)')
    .option('--port <port>', 'Use this exact port instead of auto-allocating', parsePortFlag)
    .option('--command <cmd>', 'Override the project dev_command for this run only')
    .option('--subrepo <repoPath>', 'Start dev for a specific nested repo (requires multi-repo task)')
    .option('--all-subrepos', 'Start dev for every configured subrepo of the task (parallel)')
    .action(
      async (
        taskId: string,
        opts: { port?: number; command?: string; subrepo?: string; allSubrepos?: boolean },
      ) => {
        const db = getDb()
        try {
          const projectRepo = new ProjectRepository(db)

          const task = resolveTaskOrExit(db, taskId)
          const project = projectRepo.findById(task.project_id)
          if (!project) {
            console.error(chalk.red(`Project not found: ${task.project_id}`))
            process.exit(1)
          }

          const targets = resolveDevTargets(db, task, opts)

          if (targets.length > 1 && opts.port != null) {
            console.error(
              chalk.red('--port cannot be combined with --all-subrepos (each subrepo needs its own port)'),
            )
            process.exit(1)
          }

          const results = await Promise.allSettled(
            targets.map(target =>
              startOneTarget(db, project, task, target.subrepo, {
                port: opts.port,
                command: opts.command,
              }),
            ),
          )

          let failures = 0
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const target = targets[i]
            const label = target.subrepo ? `[${target.subrepo.repo_path}] ` : ''
            if (result.status === 'rejected') {
              failures++
              const message =
                result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason)
              console.error(chalk.red(`${label}${message}`))
            } else {
              const { devServer } = result.value
              console.log(chalk.green(`${label}Dev server started on port ${devServer.port}`))
              console.log(`  PID:    ${chalk.cyan(String(devServer.pid ?? 'unknown'))}`)
              console.log(`  Server: ${chalk.cyan(devServer.id)}`)
              if (devServer.log_path) {
                console.log(`  Log:    ${chalk.gray(devServer.log_path)}`)
              }
            }
          }
          if (failures > 0) process.exit(1)
        } catch (error) {
          console.error(chalk.red('Error starting dev server:'), (error as Error).message)
          process.exit(1)
        } finally {
          db.close()
        }
      },
    )

  devCmd
    .command('stop <taskId>')
    .description('Stop the dev server for a task (or one of its subrepos)')
    .option('--subrepo <repoPath>', 'Stop dev for a specific nested repo')
    .option('--all-subrepos', 'Stop dev for every configured subrepo of the task')
    .action((taskId: string, opts: { subrepo?: string; allSubrepos?: boolean }) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const subrepoRepo = new TaskSubrepoRepository(db)
        const devServerRepo = new DevServerRepository(db)

        const task = resolveTaskOrExit(db, taskId)
        const targets = resolveDevTargets(db, task, opts)

        let stoppedCount = 0
        for (const { subrepo } of targets) {
          const server = subrepo
            ? devServerRepo.findByTaskSubrepoId(subrepo.id)
            : devServerRepo.findByTaskId(task.id)

          const label = subrepo ? `[${subrepo.repo_path}] ` : ''
          if (!server) {
            console.error(chalk.yellow(`${label}No dev server found`))
            continue
          }

          stopDevServer(db, server.id)

          if (server.port !== null) {
            releasePort(db, server.port)
          }

          if (subrepo) {
            subrepoRepo.update(subrepo.id, { dev_server_state: 'stopped' })
          } else {
            taskRepo.update(task.id, { port: undefined, dev_server_state: 'stopped' })
          }

          console.log(chalk.green(`${label}Dev server stopped`))
          stoppedCount++
        }

        if (stoppedCount === 0) {
          process.exit(1)
        }
      } catch (error) {
        console.error(chalk.red('Error stopping dev server:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  devCmd
    .command('logs <taskId>')
    .description('Print the dev server log path (and optionally tail it) for a task / subrepo')
    .option('-f, --follow', 'Follow the log file (tail -f)')
    .option('-n, --lines <count>', 'Print the last N lines before exiting / following', '50')
    .option('--subrepo <repoPath>', 'Read logs for a specific nested repo')
    .action(
      async (
        taskId: string,
        opts: { follow?: boolean; lines: string; subrepo?: string },
      ) => {
      const db = getDb()
      try {
        const devServerRepo = new DevServerRepository(db)
        const task = resolveTaskOrExit(db, taskId)

        // logs supports a single target only — pass --subrepo to scope.
        const targets = resolveDevTargets(db, task, { subrepo: opts.subrepo })
        if (targets.length !== 1) {
          console.error(chalk.red('Pass --subrepo <repoPath> to choose which subrepo to read logs for'))
          process.exit(1)
        }
        const { subrepo } = targets[0]
        const devServer = subrepo
          ? devServerRepo.findByTaskSubrepoId(subrepo.id)
          : devServerRepo.findByTaskId(task.id)
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
    },
  )

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
          head: ['project', 'task', 'subrepo', 'port', 'pid', 'status', 'started_at'],
        })

        const subrepoRepo = new TaskSubrepoRepository(db)

        for (const projectId of projectIds) {
          const project = projectRepo.findById(projectId)
          if (!project) continue

          const { servers } = getPoolStatus(db, projectId)

          for (const server of servers) {
            const task = server.task_id ? taskRepo.findById(server.task_id) : null
            const subrepo = server.task_subrepo_id
              ? subrepoRepo.findById(server.task_subrepo_id)
              : null
            table.push([
              project.slug,
              task ? task.title : server.task_id ?? '-',
              subrepo ? subrepo.repo_path : '-',
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
