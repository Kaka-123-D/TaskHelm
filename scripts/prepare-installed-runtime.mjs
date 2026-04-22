import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { mkdtempSync } from 'node:fs'

const packageRoot = resolve(new URL('..', import.meta.url).pathname)
const webRoot = join(packageRoot, 'packages', 'web')
const nextBin = join(packageRoot, 'node_modules', 'next', 'dist', 'bin', 'next')

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

  mkdirSync(dirname(runtimeRoot), { recursive: true })
  const stageRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-prepare-'))

  try {
    cpSync(packageRoot, stageRoot, {
      recursive: true,
      dereference: true,
      filter: sourcePath => {
        const normalized = sourcePath.replace(/\\/g, '/')
        if (normalized.includes('/packages/web/.next')) return false
        if (normalized.includes('/packages/web/runtime')) return false
        if (normalized.endsWith('/.git')) return false
        return true
      },
    })

    const stageWebRoot = join(stageRoot, 'packages', 'web')
    const stageNextBin = join(stageRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
    const cleanRuntimeScript = join(stageWebRoot, 'scripts', 'clean-runtime.mjs')
    const packageRuntimeScript = join(stageWebRoot, 'scripts', 'package-runtime.mjs')

    assertExists(stageNextBin, 'staged Next.js runtime build binary')
    assertExists(packageRuntimeScript, 'staged runtime packaging script')

    if (existsSync(cleanRuntimeScript)) {
      runNodeScript(cleanRuntimeScript, [], stageWebRoot)
    }

    execFileSync(process.execPath, [stageNextBin, 'build'], {
      cwd: stageWebRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1',
        TASKHELM_RUNTIME_PREPARE_VERSION: version,
      },
    })

    runNodeScript(packageRuntimeScript, ['--output', runtimeRoot, '--skip-archive'], stageWebRoot)
  } finally {
    rmSync(stageRoot, { recursive: true, force: true })
  }
}

main()
