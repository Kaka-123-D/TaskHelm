import type { Command } from 'commander'
import chalk from 'chalk'
import { ProjectRepository, TaskRepository } from '@taskhelm/core'
import { getDb } from '../db.js'
import { formatJson } from '../formatters/json.js'
import { formatProjectsTable, formatProjectDetail } from '../formatters/table.js'

export function registerProjectCommands(program: Command): void {
  const projectCmd = program.command('project').description('Manage projects')

  projectCmd
    .command('create')
    .description('Create a new project')
    .requiredOption('--name <name>', 'Project name')
    .requiredOption('--slug <slug>', 'Project slug (unique identifier)')
    .requiredOption('--repo <path>', 'Local repo root path')
    .option('--description <text>', 'Project description')
    .option('--default-branch <branch>', 'Default git branch')
    .option('--dev-command <cmd>', 'Command to start dev server')
    .option('--install-command <cmd>', 'Command to install dependencies')
    .option('--test-command <cmd>', 'Command to run tests')
    .action((opts) => {
      const db = getDb()
      try {
        const repo = new ProjectRepository(db)
        const project = repo.create({
          name: opts.name as string,
          slug: opts.slug as string,
          local_repo_root: opts.repo as string,
          description: opts.description as string | undefined,
          default_branch: opts.defaultBranch as string | undefined,
          dev_command: opts.devCommand as string | undefined,
          install_command: opts.installCommand as string | undefined,
          test_command: opts.testCommand as string | undefined,
        })
        console.log(chalk.green('Project created:'))
        console.log(formatJson(project))
      } catch (error) {
        console.error(chalk.red('Error creating project:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  projectCmd
    .command('list')
    .description('List all projects')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const taskRepo = new TaskRepository(db)
        const projects = projectRepo.findAll()

        if (opts.json) {
          const withCounts = projects.map((p) => ({
            ...p,
            task_count: taskRepo.findByProjectId(p.id).length,
          }))
          console.log(formatJson(withCounts))
          return
        }

        const taskCounts = new Map<string, number>()
        for (const p of projects) {
          taskCounts.set(p.id, taskRepo.findByProjectId(p.id).length)
        }

        if (projects.length === 0) {
          console.log(chalk.yellow('No projects found.'))
          return
        }

        console.log(formatProjectsTable(projects, taskCounts))
      } catch (error) {
        console.error(chalk.red('Error listing projects:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  projectCmd
    .command('show <slug>')
    .description('Show project details')
    .option('--json', 'Output as JSON')
    .action((slug: string, opts) => {
      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const taskRepo = new TaskRepository(db)

        const project = projectRepo.findBySlug(slug)
        if (!project) {
          console.error(chalk.red(`Project not found: ${slug}`))
          process.exit(1)
        }

        const tasks = taskRepo.findByProjectId(project.id)
        const taskCount = tasks.length
        const activeCount = tasks.filter(
          (t) => t.status === 'running' || t.status === 'reviewing'
        ).length

        if (opts.json) {
          console.log(formatJson({ ...project, task_count: taskCount, active_task_count: activeCount }))
          return
        }

        console.log(formatProjectDetail(project, taskCount, activeCount))
      } catch (error) {
        console.error(chalk.red('Error showing project:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })
}
