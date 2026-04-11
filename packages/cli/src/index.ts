import { Command } from 'commander'
import { registerProjectCommands } from './commands/project.js'
import { registerTaskCommands } from './commands/task.js'

export const program = new Command()
  .name('taskhelm')
  .description('Autonomous AI engineering manager for solo operators')
  .version('0.1.0')

registerProjectCommands(program)
registerTaskCommands(program)
