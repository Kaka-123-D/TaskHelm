import type { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import {
  ProjectRepository,
  TaskRepository,
  DevServerRepository,
  allocatePort,
  releasePort,
} from '@taskhelm/core'
import { startDevServer, stopDevServer, getPoolStatus } from '@taskhelm/supervisor'
import { getDb } from '../db.js'

export function registerDevCommands(program: Command): void {
  const devCmd = program.command('dev').description('Manage dev servers for tasks')

  devCmd
    .command('start <taskId>')
    .description('Start a dev server for a task')
    .action(async (taskId: string) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const projectRepo = new ProjectRepository(db)

        const task = taskRepo.findById(taskId)
        if (!task) {
          console.error(chalk.red(`Task not found: ${taskId}`))
          process.exit(1)
        }

        const project = projectRepo.findById(task.project_id)
        if (!project) {
          console.error(chalk.red(`Project not found: ${task.project_id}`))
          process.exit(1)
        }

        if (!project.dev_command) {
          console.error(chalk.red('Project has no dev_command configured'))
          process.exit(1)
        }

        if (!task.worktree_path) {
          console.error(
            chalk.red('Task has no worktree_path. Run `workspace init <taskId>` first.')
          )
          process.exit(1)
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

        console.log(chalk.green(`Dev server started on port ${devServer.port}`))
        console.log(`  PID:    ${chalk.cyan(String(devServer.pid ?? 'unknown'))}`)
        console.log(`  Server: ${chalk.cyan(devServer.id)}`)
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

        const task = taskRepo.findById(taskId)
        if (!task) {
          console.error(chalk.red(`Task not found: ${taskId}`))
          process.exit(1)
        }

        const devServer = devServerRepo.findByTaskId(taskId)
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
    .command('pool')
    .description('Show dev server pool status')
    .option('--project <slug>', 'Filter by project slug')
    .action((opts: { project?: string }) => {
      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const devServerRepo = new DevServerRepository(db)
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
