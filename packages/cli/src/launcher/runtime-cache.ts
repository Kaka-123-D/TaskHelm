import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installRuntimeBundle, readRuntimeManifestEntryPoints } from './runtime-download.js'
import { resolveRuntimeManifest } from './runtime-manifest.js'

const ENTRYPOINT_CANDIDATES = ['packages/web/server.js', 'server.js'] as const

function readPackageName(packageRoot: string): string | null {
  const packageJsonPath = join(packageRoot, 'package.json')
  if (!existsSync(packageJsonPath)) return null

  const raw = readFileSync(packageJsonPath, 'utf-8')
  const parsed = JSON.parse(raw) as { readonly name?: string }
  return parsed.name ?? null
}

function isTaskHelmPackageRoot(candidate: string): boolean {
  return readPackageName(candidate) === 'taskhelm'
}

export function getCliPackageRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url))

  while (true) {
    const packageJsonPath = join(current, 'package.json')
    if (existsSync(packageJsonPath)) {
      const raw = readFileSync(packageJsonPath, 'utf-8')
      const parsed = JSON.parse(raw) as { readonly name?: string }
      if (parsed.name === '@taskhelm/cli') {
        return current
      }
    }

    const parent = dirname(current)
    if (parent === current) {
      throw new Error('Unable to resolve @taskhelm/cli package root from launcher runtime')
    }
    current = parent
  }
}

export function getTaskHelmPackageRoot(cliRoot: string = getCliPackageRoot()): string | null {
  const envRoot = process.env.TASKHELM_PACKAGE_ROOT
  if (envRoot && isTaskHelmPackageRoot(envRoot)) {
    return envRoot
  }

  let current = dirname(cliRoot)

  while (true) {
    if (isTaskHelmPackageRoot(current)) {
      return current
    }

    const siblingCandidate = join(current, 'taskhelm')
    if (isTaskHelmPackageRoot(siblingCandidate)) {
      return siblingCandidate
    }

    const nodeModulesCandidate = join(current, 'node_modules', 'taskhelm')
    if (isTaskHelmPackageRoot(nodeModulesCandidate)) {
      return nodeModulesCandidate
    }

    const parent = dirname(current)
    if (parent === current) {
      return null
    }
    current = parent
  }
}

export function getBundledRuntimeCandidates(cliRoot: string = getCliPackageRoot()): readonly string[] {
  return [
    resolve(cliRoot, '..', '..', 'runtime', 'standalone', 'packages', 'web', 'server.js'),
    resolve(cliRoot, '..', '..', 'runtime', 'standalone', 'server.js'),
    resolve(cliRoot, '..', '..', '..', 'runtime', 'standalone', 'packages', 'web', 'server.js'),
    resolve(cliRoot, '..', '..', '..', 'runtime', 'standalone', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', 'runtime', 'standalone', 'packages', 'web', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', 'runtime', 'standalone', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', '.next', 'standalone', 'packages', 'web', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', '.next', 'standalone', 'server.js'),
  ]
}

function getLocalPrepareScript(): string | null {
  const taskhelmRoot = getTaskHelmPackageRoot()
  if (!taskhelmRoot) return null

  const candidate = join(taskhelmRoot, 'scripts', 'prepare-installed-runtime.mjs')
  return existsSync(candidate) ? candidate : null
}

export function getTaskHelmHome(): string {
  return process.env.TASKHELM_HOME ?? join(homedir(), '.taskhelm')
}

export function getRuntimeRoot(version: string): string {
  return join(getTaskHelmHome(), 'runtime', version)
}

export function getRuntimeEntrypoint(version: string): string {
  const runtimeRoot = getRuntimeRoot(version)
  const candidate = (readRuntimeManifestEntryPoints(runtimeRoot) ?? ENTRYPOINT_CANDIDATES)
    .map(relativePath => join(runtimeRoot, relativePath))
    .find(entrypoint => existsSync(entrypoint))

  if (!candidate) {
    return join(runtimeRoot, ENTRYPOINT_CANDIDATES[0])
  }

  return candidate
}

export function isRuntimeReady(version: string): boolean {
  const runtimeRoot = getRuntimeRoot(version)
  const candidates = readRuntimeManifestEntryPoints(runtimeRoot) ?? ENTRYPOINT_CANDIDATES
  return candidates.some(relativePath => existsSync(join(runtimeRoot, relativePath)))
}

export function getBundledRuntimeEntrypoint(): string | null {
  if (process.env.TASKHELM_DISABLE_BUNDLED_RUNTIME === '1') {
    return null
  }

  const explicit = process.env.TASKHELM_BUNDLED_RUNTIME_ENTRYPOINT
  if (explicit && existsSync(explicit)) return explicit

  return getBundledRuntimeCandidates().find(candidate => existsSync(candidate)) ?? null
}

export function getBundledRuntimeRoot(): string | null {
  const entrypoint = getBundledRuntimeEntrypoint()
  if (!entrypoint) return null

  if (entrypoint.endsWith('packages/web/server.js')) {
    return resolve(dirname(entrypoint), '..', '..')
  }

  if (entrypoint.endsWith('server.js')) {
    return dirname(entrypoint)
  }

  return null
}

function prepareRuntimeLocally(version: string): string {
  const runtimeRoot = getRuntimeRoot(version)
  const prepareScript = getLocalPrepareScript()
  if (!prepareScript) {
    throw new Error(
      'TaskHelm local runtime prepare script is missing from this installation. Reinstall taskhelm or rebuild the package.',
    )
  }

  try {
    execFileSync(
      process.execPath,
      [prepareScript, '--runtime-root', runtimeRoot, '--version', version],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          NEXT_TELEMETRY_DISABLED: '1',
        },
      },
    )
  } catch (error) {
    throw new Error(
      `TaskHelm could not prepare the local web runtime for version ${version}. ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return getRuntimeEntrypoint(version)
}

export async function ensureRuntime(version: string): Promise<string> {
  if (isRuntimeReady(version)) return getRuntimeEntrypoint(version)

  const bundledRoot = getBundledRuntimeRoot()
  if (bundledRoot) {
    const runtimeRoot = getRuntimeRoot(version)
    mkdirSync(dirname(runtimeRoot), { recursive: true })
    cpSync(bundledRoot, runtimeRoot, { recursive: true })
    return getRuntimeEntrypoint(version)
  }

  const manifest = await resolveRuntimeManifest(version)
  if (manifest) {
    const runtimeRoot = getRuntimeRoot(version)
    mkdirSync(dirname(runtimeRoot), { recursive: true })
    await installRuntimeBundle({ manifest, runtimeRoot })
    return getRuntimeEntrypoint(version)
  }

  return prepareRuntimeLocally(version)
}
