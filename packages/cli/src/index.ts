import { Command } from 'commander'
import { registerProjectCommands } from './commands/project.js'
import { registerTaskCommands } from './commands/task.js'
import { registerWorkspaceCommands } from './commands/workspace.js'
import { registerDevCommands } from './commands/dev.js'
import { registerAgentCommands } from './commands/agent.js'
import { registerSpecdownCommands } from './commands/specdown.js'

export const program = new Command()
  .name('taskhelm')
  .description('Autonomous AI engineering manager for solo operators')
  .version('0.1.0')

registerProjectCommands(program)
registerTaskCommands(program)
registerWorkspaceCommands(program)
registerDevCommands(program)
registerAgentCommands(program)
registerSpecdownCommands(program)
