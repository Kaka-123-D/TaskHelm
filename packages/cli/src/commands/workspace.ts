import type { Command } from 'commander'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as readline from 'node:readline'
import chalk from 'chalk'
import {
  ProjectRepository,
  TaskRepository,
  formatBranchName,
  createBranch,
  branchExists,
  createWorktree,
  removeWorktree,
  listWorktrees,
  canonicalWorktreePath,
  isWithinDir,
  getWorktreeBranch,
} from '@taskhelm/core'
import { getDb } from '../db.js'
import { resolveTaskOrExit } from '../resolver.js'

function promptConfirm(question: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, answer => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      resolve(normalized === 'y' || normalized === 'yes')
    })
  })
}

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

        const task = resolveTaskOrExit(db, taskId)
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

        taskRepo.update(task.id, {
          branch_name: branchName,
          worktree_path: worktreePath,
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
    .command('attach <taskId> <worktreePath>')
    .description('Attach an existing on-disk worktree to a task without creating a new one')
    .option('-f, --force', 'Override safety checks (path outside project worktree_root, branch in use, task already has a worktree)')
    .action((taskId: string, rawWorktreePath: string, opts: { force?: boolean }) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const projectRepo = new ProjectRepository(db)

        const task = resolveTaskOrExit(db, taskId)
        const project = projectRepo.findById(task.project_id)
        if (!project) {
          console.error(chalk.red(`Project not found: ${task.project_id}`))
          process.exit(1)
        }

        const repoRoot = project.local_repo_root
        const worktreeRootDir = project.worktree_root ?? path.join(repoRoot, '.worktrees')
        const targetPath = path.resolve(rawWorktreePath)

        if (!fs.existsSync(targetPath)) {
          console.error(chalk.red(`Path does not exist: ${targetPath}`))
          process.exit(1)
        }

        const canonical = canonicalWorktreePath(targetPath)

        const registered = listWorktrees(repoRoot).map(canonicalWorktreePath)
        if (!registered.includes(canonical)) {
          console.error(chalk.red(`Path is not a registered git worktree of ${repoRoot}: ${canonical}`))
          console.error(chalk.dim('Run `git worktree list` in the project repo to see registered worktrees.'))
          process.exit(1)
        }

        if (canonical === canonicalWorktreePath(repoRoot)) {
          console.error(chalk.red('Cannot attach the project main repo as a task worktree.'))
          process.exit(1)
        }

        if (!opts.force && !isWithinDir(worktreeRootDir, canonical)) {
          console.error(
            chalk.red(`Worktree path is outside project worktree_root (${worktreeRootDir}): ${canonical}`)
          )
          console.error(chalk.dim('Pass --force to attach a worktree from elsewhere.'))
          process.exit(1)
        }

        const conflictingTask = taskRepo
          .findByProjectId(project.id)
          .find(other => other.id !== task.id && other.worktree_path != null
            && canonicalWorktreePath(other.worktree_path) === canonical)
        if (conflictingTask && !opts.force) {
          console.error(
            chalk.red(`Worktree already attached to another task: ${conflictingTask.title} (${conflictingTask.id})`)
          )
          console.error(chalk.dim('Pass --force to reassign — the other task will lose its worktree_path.'))
          process.exit(1)
        }

        if (task.worktree_path != null && !opts.force) {
          console.error(
            chalk.red(`Task already has a worktree_path set: ${task.worktree_path}`)
          )
          console.error(chalk.dim('Run `workspace cleanup` first, or pass --force to overwrite.'))
          process.exit(1)
        }

        const branch = getWorktreeBranch(canonical)
        if (!branch) {
          console.error(chalk.red(`Worktree has no current branch (detached HEAD?): ${canonical}`))
          process.exit(1)
        }

        if (conflictingTask) {
          taskRepo.update(conflictingTask.id, { worktree_path: null })
        }

        taskRepo.update(task.id, {
          branch_name: branch,
          workspace_branch: branch,
          worktree_path: canonical,
        })

        console.log(chalk.green('Worktree attached:'))
        console.log(`  Task:     ${chalk.bold(task.title)} (${task.id})`)
        console.log(`  Branch:   ${chalk.cyan(branch)}`)
        console.log(`  Worktree: ${chalk.cyan(canonical)}`)
      } catch (error) {
        console.error(chalk.red('Error attaching worktree:'), (error as Error).message)
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
        const task = resolveTaskOrExit(db, taskId)
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
    .option('-y, --yes', 'Skip the confirmation prompt')
    .action(async (taskId: string, opts: { yes?: boolean }) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const projectRepo = new ProjectRepository(db)

        const task = resolveTaskOrExit(db, taskId)
        const project = projectRepo.findById(task.project_id)
        if (!project) {
          console.error(chalk.red(`Project not found: ${task.project_id}`))
          process.exit(1)
        }

        if (!opts.yes) {
          const target = task.worktree_path ?? '(no worktree path set)'
          console.log(chalk.bold('About to clean up workspace:'))
          console.log(`  Task:     ${task.title} (${task.id})`)
          console.log(`  Branch:   ${task.branch_name ?? chalk.dim('not set')} ${chalk.dim('(preserved)')}`)
          console.log(`  Worktree: ${target}`)
          const ok = await promptConfirm(chalk.yellow('Continue? [y/N] '))
          if (!ok) {
            console.log(chalk.dim('Aborted.'))
            return
          }
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
