import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

const webRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const nextDir = join(webRoot, '.next')
const runtimeDir = join(webRoot, 'runtime')

function removeDirectoryWithRetry(path, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      rmSync(path, { recursive: true, force: true })
      return
    } catch (error) {
      const retryable =
        error instanceof Error &&
        'code' in error &&
        (error.code === 'ENOTEMPTY' || error.code === 'EBUSY' || error.code === 'EPERM')

      if (!retryable || attempt === attempts) {
        throw error
      }
    }
  }
}

if (existsSync(nextDir)) {
  removeDirectoryWithRetry(nextDir)
}

if (existsSync(runtimeDir)) {
  removeDirectoryWithRetry(runtimeDir)
}
