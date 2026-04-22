import { readFileSync } from 'node:fs'
import { ensureRuntime } from './runtime-cache.js'
import { openBrowser } from './open-browser.js'
import { startRuntimeServer, waitForServer } from './server-process.js'

interface PackageMeta {
  readonly version: string
}

function getCliVersion(): string {
  const raw = readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8')
  return (JSON.parse(raw) as PackageMeta).version
}

async function resolveRuntimeEntrypoint(): Promise<string> {
  const version = getCliVersion()
  return await ensureRuntime(version)
}

export async function launchTaskHelmApp(): Promise<void> {
  const port = 4100
  const url = `http://127.0.0.1:${port}`
  const entrypoint = await resolveRuntimeEntrypoint()
  const child = startRuntimeServer(entrypoint, port)

  child.once('exit', code => {
    if (code !== null && code !== 0) {
      process.exitCode = code
    }
  })

  await waitForServer(url)
  openBrowser(url)
}
