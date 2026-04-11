import type { Command } from 'commander'
import * as fs from 'node:fs'
import * as path from 'node:path'
import chalk from 'chalk'
import {
  ProjectRepository,
  TaskRepository,
  writeCapsule,
  formatBranchName,
  createBranch,
  branchExists,
  createWorktree,
  removeWorktree,
} from '@taskhelm/core'
import { getDb } from '../db.js'

export function registerWorkspaceCommands(program: Command): void {
  const wsCmd = program.command('workspace').description('Manage task workspaces (branches + worktrees)')

  wsCmd
    .command('init <taskId>')
    .description('Initialize branch and worktree for a task')
    .action((taskId: string) => {
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

        const repoRoot = project.local_repo_root
        const pattern = project.branch_naming_pattern ?? 'task/{id}'
        const worktreeRootDir = project.worktree_root ?? path.join(repoRoot, '.worktrees')

        const branchName = formatBranchName(pattern, { id: task.id, key: task.key })

        if (!branchExists(repoRoot, branchName)) {
          createBranch(repoRoot, branchName)
          console.log(chalk.green(`Created branch: ${branchName}`))
        } else {
          console.log(chalk.dim(`Branch already exists: ${branchName}`))
        }

        if (!fs.existsSync(worktreeRootDir)) {
          fs.mkdirSync(worktreeRootDir, { recursive: true })
        }

        const worktreePath = createWorktree({
          repoRoot,
          worktreeRoot: worktreeRootDir,
          branchName,
        })

        const updatedTask = taskRepo.update(task.id, {
          branch_name: branchName,
          worktree_path: worktreePath,
        })

        writeCapsule({
          baseDir: repoRoot,
          projectSlug: project.slug,
          task: updatedTask,
          project,
        })

        console.log(chalk.green('Workspace initialized:'))
        console.log(`  Task:      ${chalk.bold(task.title)}`)
        console.log(`  Branch:    ${chalk.cyan(branchName)}`)
        console.log(`  Worktree:  ${chalk.cyan(worktreePath)}`)
      } catch (error) {
        console.error(chalk.red('Error initializing workspace:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  wsCmd
    .command('status <taskId>')
    .description('Show workspace status for a task')
    .action((taskId: string) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)

        const task = taskRepo.findById(taskId)
        if (!task) {
          console.error(chalk.red(`Task not found: ${taskId}`))
          process.exit(1)
        }

        const worktreeExists =
          task.worktree_path != null && fs.existsSync(task.worktree_path)

        console.log(chalk.bold('Workspace Status'))
        console.log(`  Task:          ${chalk.bold(task.title)} (${task.id})`)
        console.log(`  Branch:        ${task.branch_name ?? chalk.dim('not set')}`)
        console.log(`  Worktree Path: ${task.worktree_path ?? chalk.dim('not set')}`)
        console.log(
          `  Worktree:      ${
            task.worktree_path == null
              ? chalk.dim('not set')
              : worktreeExists
              ? chalk.green('exists on disk')
              : chalk.yellow('missing from disk')
          }`
        )
      } catch (error) {
        console.error(chalk.red('Error getting workspace status:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  wsCmd
    .command('cleanup <taskId>')
    .description('Remove worktree and clear workspace fields from task (branch is preserved)')
    .action((taskId: string) => {
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

        if (task.worktree_path != null && fs.existsSync(task.worktree_path)) {
          removeWorktree(project.local_repo_root, task.worktree_path)
          console.log(chalk.green(`Removed worktree: ${task.worktree_path}`))
        } else if (task.worktree_path != null) {
          console.log(chalk.yellow(`Worktree path not found on disk, clearing DB record: ${task.worktree_path}`))
        } else {
          console.log(chalk.dim('No worktree set for this task'))
        }

        taskRepo.update(task.id, {
          branch_name: null,
          worktree_path: null,
        })

        console.log(chalk.green('Workspace cleaned up.'))
        console.log(chalk.dim('Note: branch was preserved (not deleted)'))
      } catch (error) {
        console.error(chalk.red('Error cleaning up workspace:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })
}
