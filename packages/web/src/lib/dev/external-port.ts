import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface ExternalPortProcessInfo {
  readonly port: number
  readonly pid: number | null
  readonly command: string | null
  readonly user: string | null
  readonly cwd: string | null
}

function parsePid(raw: string): number | null {
  const pid = Number(raw.trim())
  return Number.isInteger(pid) && pid > 0 ? pid : null
}

async function findListeningPid(port: number): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('lsof', [
      '-nP',
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
      '-Fp',
    ])
    const line = stdout
      .split('\n')
      .map(entry => entry.trim())
      .find(entry => entry.startsWith('p'))

    return line ? parsePid(line.slice(1)) : null
  } catch {
    return null
  }
}

async function inspectProcess(pid: number): Promise<Pick<ExternalPortProcessInfo, 'command' | 'user' | 'cwd'>> {
  let command: string | null = null
  let user: string | null = null
  let cwd: string | null = null

  try {
    const { stdout } = await execFileAsync('ps', ['-p', String(pid), '-o', 'pid=,user=,command='])
    const match = stdout.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/)
    if (match) {
      user = match[2] ?? null
      command = match[3] ?? null
    }
  } catch {
    // Best-effort only.
  }

  try {
    const { stdout } = await execFileAsync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'])
    const line = stdout
      .split('\n')
      .map(entry => entry.trim())
      .find(entry => entry.startsWith('n'))
    cwd = line ? line.slice(1) || null : null
  } catch {
    // Best-effort only.
  }

  return { command, user, cwd }
}

export async function inspectListeningPort(port: number): Promise<ExternalPortProcessInfo | null> {
  const pid = await findListeningPid(port)
  if (!pid) {
    return null
  }

  const process = await inspectProcess(pid)
  return {
    port,
    pid,
    ...process,
  }
}

export async function killExternalProcessForPort(port: number, pid: number): Promise<{ readonly stopped: boolean }> {
  const current = await inspectListeningPort(port)
  if (!current || current.pid !== pid) {
    throw new Error(`Process ${pid} is no longer listening on port ${port}`)
  }

  process.kill(pid, 'SIGTERM')
  return { stopped: true }
}
