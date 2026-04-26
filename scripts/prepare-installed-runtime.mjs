import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { mkdtempSync } from 'node:fs'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const webRoot = join(packageRoot, 'packages', 'web')
const require = createRequire(import.meta.url)

function findInstallNodeModulesRoot(fromPath) {
  let current = dirname(fromPath)
  let fallbackNodeModulesRoot = ''

  while (true) {
    if (basename(current) === 'node_modules') {
      fallbackNodeModulesRoot ||= current
      if (existsSync(join(current, '.pnpm'))) {
        return current
      }
    }

    const parent = dirname(current)
    if (parent === current) {
      if (fallbackNodeModulesRoot) {
        return fallbackNodeModulesRoot
      }
      throw new Error(`Unable to resolve installed node_modules root for ${fromPath}`)
    }
    current = parent
  }
}

const nextPackageJson = require.resolve('next/package.json')
const nextBin = join(dirname(nextPackageJson), 'dist', 'bin', 'next')
const installNodeModulesRoot = findInstallNodeModulesRoot(nextPackageJson)
const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8'))

function getDirectDependencies() {
  return Object.keys(packageJson.dependencies ?? {})
}

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

function materializeDirectDependencies(stageRoot) {
  const stageNodeModulesRoot = join(stageRoot, 'node_modules')

  for (const dependency of getDirectDependencies()) {
    const dependencyRoot = resolveInstalledDependencyRoot(dependency)
    const stageDependencyRoot = join(stageNodeModulesRoot, dependency)

    if (existsSync(stageDependencyRoot)) {
      continue
    }

    mkdirSync(dirname(stageDependencyRoot), { recursive: true })
    symlinkSync(dependencyRoot, stageDependencyRoot)
  }
}

function resolveInstalledDependencyRoot(dependency) {
  const directPackageJson = join(installNodeModulesRoot, dependency, 'package.json')
  if (existsSync(directPackageJson)) {
    return dirname(directPackageJson)
  }

  const pnpmSharedPackageJson = join(installNodeModulesRoot, '.pnpm', 'node_modules', dependency, 'package.json')
  if (existsSync(pnpmSharedPackageJson)) {
    return dirname(pnpmSharedPackageJson)
  }

  throw new Error(`Direct dependency ${dependency} is missing from installed node_modules at ${installNodeModulesRoot}`)
}

function main() {
  const { runtimeRoot, version } = parseArgs(process.argv)

  console.error(`[taskhelm] Preparing local web runtime${version ? ` ${version}` : ''}...`)

  assertExists(webRoot, 'web workspace')
  assertExists(nextBin, 'Next.js runtime build binary')
  assertExists(installNodeModulesRoot, 'installed node_modules root')

  mkdirSync(dirname(runtimeRoot), { recursive: true })
  const stageRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-prepare-'))

  try {
    console.error('[taskhelm] Staging package assets...')
    cpSync(packageRoot, stageRoot, {
      recursive: true,
      dereference: true,
      filter: sourcePath => {
        const relativeSourcePath = relative(packageRoot, sourcePath).replace(/\\/g, '/')
        if (relativeSourcePath === 'node_modules' || relativeSourcePath.startsWith('node_modules/')) return false
        if (relativeSourcePath === 'packages/web/.next' || relativeSourcePath.startsWith('packages/web/.next/')) return false
        if (relativeSourcePath === 'packages/web/runtime' || relativeSourcePath.startsWith('packages/web/runtime/')) return false
        if (relativeSourcePath === '.git' || relativeSourcePath.startsWith('.git/')) return false
        return true
      },
    })

    console.error('[taskhelm] Linking installed dependencies...')
    cpSync(installNodeModulesRoot, join(stageRoot, 'node_modules'), {
      recursive: true,
      dereference: false,
    })
    materializeDirectDependencies(stageRoot)

    const stageWebRoot = join(stageRoot, 'packages', 'web')
    const stageNextBin = join(stageRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
    const cleanRuntimeScript = join(stageWebRoot, 'scripts', 'clean-runtime.mjs')
    const packageRuntimeScript = join(stageWebRoot, 'scripts', 'package-runtime.mjs')

    assertExists(stageNextBin, 'staged Next.js runtime build binary')
    assertExists(packageRuntimeScript, 'staged runtime packaging script')

    if (existsSync(cleanRuntimeScript)) {
      runNodeScript(cleanRuntimeScript, [], stageWebRoot)
    }

    console.error('[taskhelm] Building web runtime. This can take a minute on first launch...')
    execFileSync(process.execPath, [stageNextBin, 'build'], {
      cwd: stageWebRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: '1',
        TASKHELM_RUNTIME_PREPARE_VERSION: version,
      },
    })

    console.error('[taskhelm] Caching prepared runtime...')
    runNodeScript(packageRuntimeScript, ['--output', runtimeRoot, '--skip-archive'], stageWebRoot)
    console.error(`[taskhelm] Runtime ready at ${runtimeRoot}`)
  } finally {
    rmSync(stageRoot, { recursive: true, force: true })
  }
}

main()
