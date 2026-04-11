import type { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { AgentRunRepository, TaskRepository } from '@taskhelm/core'
import type { AgentRun } from '@taskhelm/core'
import { getDb } from '../db.js'

const VALID_KINDS = ['implementer', 'spec-review', 'code-review', 'verify'] as const
type AgentKindArg = (typeof VALID_KINDS)[number]

// Map CLI-friendly kind names to DB kind values
const KIND_MAP: Readonly<Record<AgentKindArg, string>> = {
  implementer: 'implementer',
  'spec-review': 'spec_review',
  'code-review': 'code_review',
  verify: 'runtime_verify',
}

function formatAgentRunsTable(runs: readonly AgentRun[]): string {
  const table = new Table({
    head: ['id', 'kind', 'status', 'started_at', 'finished_at', 'error'],
  })

  for (const r of runs) {
    table.push([
      r.id.slice(0, 8),
      r.kind,
      r.status,
      r.started_at ?? '',
      r.finished_at ?? '',
      r.error_message ?? '',
    ])
  }

  return table.toString()
}

export function registerAgentCommands(program: Command): void {
  const agentCmd = program.command('agent').description('Manage agent runs')

  agentCmd
    .command('run <kind> <taskId>')
    .description('Manually start an agent run for a task')
    .action((kind: string, taskId: string) => {
      const db = getDb()
      try {
        if (!VALID_KINDS.includes(kind as AgentKindArg)) {
          console.error(
            chalk.red(`Invalid kind "${kind}". Must be one of: ${VALID_KINDS.join(', ')}`)
          )
          process.exit(1)
        }

        const taskRepo = new TaskRepository(db)
        const task = taskRepo.findById(taskId)
        if (!task) {
          console.error(chalk.red(`Task not found: ${taskId}`))
          process.exit(1)
        }

        const agentRunRepo = new AgentRunRepository(db)
        const dbKind = KIND_MAP[kind as AgentKindArg]
        const run = agentRunRepo.create({ task_id: task.id, kind: dbKind })
        agentRunRepo.start(run.id)

        console.log(chalk.green(`Agent run started: ${run.id}`))
      } catch (error) {
        console.error(chalk.red('Error starting agent run:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })

  agentCmd
    .command('status <taskId>')
    .description('Show all agent runs for a task')
    .action((taskId: string) => {
      const db = getDb()
      try {
        const taskRepo = new TaskRepository(db)
        const task = taskRepo.findById(taskId)
        if (!task) {
          console.error(chalk.red(`Task not found: ${taskId}`))
          process.exit(1)
        }

        const agentRunRepo = new AgentRunRepository(db)
        const runs = agentRunRepo.findByTaskId(task.id)

        if (runs.length === 0) {
          console.log(chalk.yellow('No agent runs found for this task.'))
          return
        }

        console.log(formatAgentRunsTable(runs))
      } catch (error) {
        console.error(chalk.red('Error fetching agent runs:'), (error as Error).message)
        process.exit(1)
      } finally {
        db.close()
      }
    })
}
