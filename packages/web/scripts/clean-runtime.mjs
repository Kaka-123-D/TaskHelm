import { existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const webRoot = resolve(new URL('..', import.meta.url).pathname)
const runtimeDir = join(webRoot, 'runtime')

if (existsSync(runtimeDir)) {
  rmSync(runtimeDir, { recursive: true, force: true })
}
