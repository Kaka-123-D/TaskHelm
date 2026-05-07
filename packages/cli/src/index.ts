import { Command } from 'commander'
import { registerProjectCommands } from './commands/project.js'
import { registerTaskCommands } from './commands/task.js'
import { registerWorkspaceCommands } from './commands/workspace.js'
import { registerDevCommands } from './commands/dev.js'
import { shouldLaunchApp } from './launcher/argv.js'
import { launchTaskHelmApp } from './launcher/index.js'
import { basename } from 'node:path'

export const program = new Command()
  .name('taskhelm')
  .description('Local-first visual workbench for parallel git-worktree work')
  .version('0.1.15')

registerProjectCommands(program)
registerTaskCommands(program)
registerWorkspaceCommands(program)
registerDevCommands(program)

export interface MainOptions {
  readonly launchAppByDefault?: boolean
}

export async function main(argv = process.argv, options: MainOptions = {}): Promise<void> {
  program.name(basename(argv[1] || 'taskhelm').replace(/\.js$/, ''))

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
