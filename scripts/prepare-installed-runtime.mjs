import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const packageRoot = resolve(new URL('..', import.meta.url).pathname)
const webRoot = join(packageRoot, 'packages', 'web')
const nextBin = join(packageRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
const cleanRuntimeScript = join(webRoot, 'scripts', 'clean-runtime.mjs')
const packageRuntimeScript = join(webRoot, 'scripts', 'package-runtime.mjs')

function parseArgs(argv) {
  let runtimeRoot = ''
  let version = ''

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--runtime-root') {
      runtimeRoot = argv[index + 1] ?? ''
      index += 1
      continue
    }

    if (value === '--version') {
      version = argv[index + 1] ?? ''
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${value}`)
  }

  if (!runtimeRoot) {
    throw new Error('Missing required --runtime-root argument')
  }

  return {
    runtimeRoot: resolve(runtimeRoot),
    version,
  }
}

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`TaskHelm runtime prepare is missing ${label} at ${path}`)
  }
}

function runNodeScript(scriptPath, args = [], cwd = packageRoot) {
  execFileSync(process.execPath, [scriptPath, ...args], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
}

function main() {
  const { runtimeRoot, version } = parseArgs(process.argv)

  assertExists(webRoot, 'web workspace')
  assertExists(nextBin, 'Next.js runtime build binary')
  assertExists(packageRuntimeScript, 'runtime packaging script')

  mkdirSync(dirname(runtimeRoot), { recursive: true })

  if (existsSync(cleanRuntimeScript)) {
    runNodeScript(cleanRuntimeScript, [], webRoot)
  }

  execFileSync(process.execPath, [nextBin, 'build'], {
    cwd: webRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      TASKHELM_RUNTIME_PREPARE_VERSION: version,
    },
  })

  runNodeScript(packageRuntimeScript, ['--output', runtimeRoot, '--skip-archive'], webRoot)
}

main()
