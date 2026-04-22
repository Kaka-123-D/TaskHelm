import { spawn, type ChildProcess } from 'node:child_process'

export function startRuntimeServer(entrypoint: string, port = 4100): ChildProcess {
  return spawn(process.execPath, [entrypoint], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
    },
    stdio: 'inherit',
  })
}

export async function waitForServer(url: string, timeoutMs = 20_000): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // ignore while waiting for startup
    }

    await new Promise(resolve => setTimeout(resolve, 300))
  }

  throw new Error(`TaskHelm web runtime did not become ready at ${url}`)
}

