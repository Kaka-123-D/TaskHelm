import { spawn } from 'node:child_process'
import { mkdirSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'
import type { AgentAdapter, AgentRunOptions, AgentRunResult } from './adapter.js'

const DEFAULT_COMMANDS: Readonly<Record<string, string>> = {
  implementer: 'echo "implementer stub"',
  spec_review: 'echo "spec_review stub"',
  code_review: 'echo "code_review stub"',
  runtime_verify: 'echo "runtime_verify stub"',
  manager_summary: 'echo "manager_summary stub"',
}

export class ShellAgentAdapter implements AgentAdapter {
  constructor(private readonly outputDir: string) {}

  async run(options: AgentRunOptions): Promise<AgentRunResult> {
    mkdirSync(this.outputDir, { recursive: true })

    const timestamp = Date.now()
    const logFile = join(this.outputDir, `${options.taskId}-${options.kind}-${timestamp}.log`)

    const command =
      options.command ?? DEFAULT_COMMANDS[options.kind] ?? `echo "${options.kind} stub"`

    return new Promise<AgentRunResult>((resolve) => {
      const logStream = createWriteStream(logFile, { flags: 'a' })

      const child = spawn('sh', ['-c', command], {
        cwd: options.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      child.stdout.pipe(logStream, { end: false })
      child.stderr.pipe(logStream, { end: false })

      child.on('error', (err) => {
        logStream.end(() => {
          resolve({
            success: false,
            outputRef: logFile,
            errorMessage: err.message,
          })
        })
      })

      child.on('close', (code) => {
        logStream.end(() => {
          if (code === 0) {
            resolve({
              success: true,
              outputRef: logFile,
              errorMessage: null,
            })
          } else {
            resolve({
              success: false,
              outputRef: logFile,
              errorMessage: `Process exited with code ${code}`,
            })
          }
        })
      })
    })
  }
}
