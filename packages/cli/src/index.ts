import { Command } from 'commander'
import { registerProjectCommands } from './commands/project.js'
import { registerTaskCommands } from './commands/task.js'
import { registerWorkspaceCommands } from './commands/workspace.js'
import { registerDevCommands } from './commands/dev.js'
import { registerAgentCommands } from './commands/agent.js'
import { shouldLaunchApp } from './launcher/argv.js'
import { launchTaskHelmApp } from './launcher/index.js'

export const program = new Command()
  .name('taskhelm')
  .description('Autonomous AI engineering manager for solo operators')
  .version('0.1.0')

registerProjectCommands(program)
registerTaskCommands(program)
registerWorkspaceCommands(program)
registerDevCommands(program)
registerAgentCommands(program)

export interface MainOptions {
  readonly launchAppByDefault?: boolean
}

export async function main(argv = process.argv, options: MainOptions = {}): Promise<void> {
  if (shouldLaunchApp(argv, options)) {
    await launchTaskHelmApp()
    return
  }

  if (argv.slice(2).length === 0) {
    program.outputHelp()
    return
  }

  await program.parseAsync(argv)
}
