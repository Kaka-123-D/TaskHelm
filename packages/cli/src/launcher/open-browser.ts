import { spawn } from 'node:child_process'
import { platform } from 'node:os'

export function openBrowser(url: string): void {
  if (process.env.TASKHELM_OPEN_BROWSER === '0' || process.env.TASKHELM_OPEN_BROWSER === 'false') {
    return
  }

  const command =
    platform() === 'darwin'
      ? ['open', url]
      : platform() === 'win32'
        ? ['cmd', '/c', 'start', '', url]
        : ['xdg-open', url]

  const [bin, ...args] = command
  const child = spawn(bin, args, {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}
