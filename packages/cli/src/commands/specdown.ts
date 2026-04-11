import type { Command } from 'commander'
import chalk from 'chalk'
import {
  isSpecDownAvailable,
  pullProjectContext,
  pushTaskArtifact,
  ProjectRepository,
  TaskRepository,
} from '@taskhelm/core'
import { getDb } from '../db.js'
import { formatJson } from '../formatters/json.js'

export function registerSpecdownCommands(program: Command): void {
  const specdownCmd = program
    .command('specdown')
    .description('SpecDown integration (optional)')

  specdownCmd
    .command('link <project-slug>')
    .description('Check SpecDown availability and link a project')
    .action((slug: string) => {
      if (!isSpecDownAvailable()) {
        console.log(
          chalk.yellow(
            'SpecDown CLI not found. Install specdown-cli to enable integration.'
          )
        )
        return
      }

      const db = getDb()
      try {
        const projectRepo = new ProjectRepository(db)
        const project = projectRepo.findBySlug(slug)
        if (!project) {
          console.error(chalk.red(`Project not found: ${slug}`))
          process.exit(1)
        }
        console.log(
          chalk.green(`SpecDown linked for project: ${project.name}`)
        )
      } finally {
        db.close()
      }
    })

  specdownCmd
    .command('pull-context <project-slug>')
    .description('Pull project context from SpecDown')
    .option('--json', 'Output as JSON')
    .action((slug: string, opts) => {
      const result = pullProjectContext(slug)

      if (!result.available) {
        console.log(
          chalk.yellow(
            'SpecDown not available. Context pull skipped.'
          )
        )
        return
      }

      if (opts.json) {
        console.log(formatJson(result.context))
      } else {
        console.log(chalk.green('Context pulled from SpecDown:'))
        console.log(formatJson(result.context))
      }
    })

  specdownCmd
    .command('push-task <task-id>')
    .description('Push task artifacts to SpecDown')
    .requiredOption('--artifact <path>', 'Path to artifact file')
    .action((taskId: string, opts) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const task = taskRepo.findById(taskId)
        if (!task) {
          console.error(chalk.red(`Task not found: ${taskId}`))
          process.exit(1)
        }

        const projectRepo = new ProjectRepository(db)
        const project = projectRepo.findById(task.project_id)
        if (!project) {
          console.error(chalk.red('Project not found for task'))
          process.exit(1)
        }

        const result = pushTaskArtifact({
          projectSlug: project.slug,
          taskId,
          artifactPath: opts.artifact as string,
        })

        if (result.pushed) {
          console.log(chalk.green('Artifact pushed to SpecDown.'))
        } else {
          console.log(
            chalk.yellow(`Push failed: ${result.error ?? 'unknown error'}`)
          )
        }
      } finally {
        db.close()
      }
    })
}
