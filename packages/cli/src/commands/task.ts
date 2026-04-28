import type { Command } from 'commander'
import chalk from 'chalk'
import { ProjectRepository, TaskRepository, writeCapsule } from '@taskhelm/core'
import { getDb } from '../db.js'
import { formatJson } from '../formatters/json.js'
import { formatTasksTable, formatTaskDetail } from '../formatters/table.js'

export function registerTaskCommands(program: Command): void {
  const taskCmd = program.command('task').description('Manage tasks')

  taskCmd
    .command('create')
    .description('Create a new task')
    .requiredOption('--project <slug>', 'Project slug')
    .requiredOption('--title <title>', 'Task title')
    .option('--goal <text>', 'Task goal description')
    .option('--key <key>', 'Task key (e.g. TASK-42)')
    .option('--refer-link <url>', 'Related reference URL')
    .option('--priority <n>', 'Task priority (integer)', parseInt)
    .action((opts) => {
      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const taskRepo = new TaskRepository(db)

        const project = projectRepo.findBySlug(opts.project as string)
        if (!project) {
          console.error(chalk.red(`Project not found: ${opts.project}`))
          process.exit(1)
        }

        const task = taskRepo.create({
          project_id: project.id,
          title: opts.title as string,
          goal: opts.goal as string | undefined,
          key: opts.key as string | undefined,
          refer_link: opts.referLink as string | undefined,
          priority: opts.priority as number | undefined,
        })

        const capsuleDir = writeCapsule({
          baseDir: project.local_repo_root,
          projectSlug: project.slug,
          task,
          project,
        })

        console.log(chalk.green('Task created:'))
        console.log(formatJson(task))
        console.log(chalk.dim(`Capsule written to: ${capsuleDir}`))
      } catch (error) {
        console.error(chalk.red('Error creating task:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  taskCmd
    .command('list')
    .description('List tasks for a project')
    .requiredOption('--project <slug>', 'Project slug')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const taskRepo = new TaskRepository(db)

        const project = projectRepo.findBySlug(opts.project as string)
        if (!project) {
          console.error(chalk.red(`Project not found: ${opts.project}`))
          process.exit(1)
        }

        const tasks = taskRepo.findByProjectId(project.id)

        if (opts.json) {
          console.log(formatJson(tasks))
          return
        }

        if (tasks.length === 0) {
          console.log(chalk.yellow('No tasks found.'))
          return
        }

        console.log(formatTasksTable(tasks))
      } catch (error) {
        console.error(chalk.red('Error listing tasks:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  taskCmd
    .command('show <id>')
    .description('Show task details')
    .option('--json', 'Output as JSON')
    .action((id: string, opts) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)

        const task = taskRepo.findById(id)
        if (!task) {
          console.error(chalk.red(`Task not found: ${id}`))
          process.exit(1)
        }

        if (opts.json) {
          console.log(formatJson(task))
          return
        }

        console.log(formatTaskDetail(task))
      } catch (error) {
        console.error(chalk.red('Error showing task:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })
}
