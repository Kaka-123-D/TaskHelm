import { spawn } from 'node:child_process'
import { platform } from 'node:os'

export function openBrowser(url: string): void {
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

