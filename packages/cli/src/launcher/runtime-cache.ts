import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installRuntimeBundle, readRuntimeManifestEntryPoints } from './runtime-download.js'
import { resolveRuntimeManifest } from './runtime-manifest.js'

const ENTRYPOINT_CANDIDATES = ['packages/web/server.js', 'server.js'] as const

function getCliPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
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
  return ENTRYPOINT_CANDIDATES.some(relativePath => existsSync(join(runtimeRoot, relativePath)))
}

export function getBundledRuntimeEntrypoint(): string | null {
  if (process.env.TASKHELM_DISABLE_BUNDLED_RUNTIME === '1') {
    return null
  }

  const explicit = process.env.TASKHELM_BUNDLED_RUNTIME_ENTRYPOINT
  if (explicit && existsSync(explicit)) return explicit

  const cliRoot = getCliPackageRoot()
  const candidates = [
    resolve(cliRoot, '..', '..', 'web', 'runtime', 'standalone', 'packages', 'web', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', 'runtime', 'standalone', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', '.next', 'standalone', 'packages', 'web', 'server.js'),
    resolve(cliRoot, '..', '..', 'web', '.next', 'standalone', 'server.js'),
  ]

  return candidates.find(candidate => existsSync(candidate)) ?? null
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
  if (!manifest) {
    throw new Error(
      [
        'TaskHelm web runtime is not available locally yet.',
        'Run the web build first, provide TASKHELM_BUNDLED_RUNTIME_ENTRYPOINT, or configure TASKHELM_RUNTIME_MANIFEST_URL/TASKHELM_RUNTIME_BUNDLE_URL.',
      ].join(' '),
    )
  }

  const runtimeRoot = getRuntimeRoot(version)
  mkdirSync(dirname(runtimeRoot), { recursive: true })
  await installRuntimeBundle({ manifest, runtimeRoot })
  return getRuntimeEntrypoint(version)
}
