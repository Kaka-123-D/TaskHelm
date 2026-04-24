import { createHash } from 'node:crypto'
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import type { RuntimeManifest } from './runtime-manifest.js'

interface InstallRuntimeBundleOptions {
  readonly manifest: RuntimeManifest
  readonly runtimeRoot: string
}

function isFileUrl(value: string): boolean {
  return value.startsWith('file://')
}

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function resolveLocalBundlePath(value: string): string {
  return isFileUrl(value) ? fileURLToPath(value) : value
}

async function copyBundleToTemp(bundleUrl: string, destination: string): Promise<void> {
  if (isHttpUrl(bundleUrl)) {
    const response = await fetch(bundleUrl)
    if (!response.ok || !response.body) {
      throw new Error(`TaskHelm runtime bundle request failed with ${response.status} for ${bundleUrl}`)
    }

    await pipeline(response.body, createWriteStream(destination))
    return
  }

  const localPath = resolveLocalBundlePath(bundleUrl)
  if (!existsSync(localPath)) {
    throw new Error(`TaskHelm runtime bundle was not found at ${localPath}`)
  }

  copyFileSync(localPath, destination)
}

async function verifyChecksum(bundlePath: string, expectedSha256?: string): Promise<void> {
  if (!expectedSha256) return

  const actual = createHash('sha256').update(await readFile(bundlePath)).digest('hex')
  if (actual !== expectedSha256) {
    throw new Error('TaskHelm runtime bundle checksum verification failed')
  }
}

function verifyEntrypoint(runtimeRoot: string, entrypointCandidates: readonly string[]): void {
  const found = entrypointCandidates.some(relativePath => existsSync(join(runtimeRoot, relativePath)))
  if (!found) {
    throw new Error('TaskHelm runtime bundle is missing the expected entrypoint')
  }
}

export async function installRuntimeBundle({
  manifest,
  runtimeRoot,
}: InstallRuntimeBundleOptions): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), 'taskhelm-runtime-download-'))
  const archivePath = join(tempDir, 'runtime.tgz')

  try {
    await copyBundleToTemp(manifest.bundleUrl, archivePath)
    await verifyChecksum(archivePath, manifest.sha256)

    rmSync(runtimeRoot, { recursive: true, force: true })
    mkdirSync(runtimeRoot, { recursive: true })
    execFileSync('tar', ['-xzf', archivePath, '-C', runtimeRoot])
    writeFileSync(
      join(runtimeRoot, 'manifest.json'),
      JSON.stringify(
        {
          entrypointCandidates: manifest.entrypointCandidates,
        },
        null,
        2,
      ),
    )
    verifyEntrypoint(runtimeRoot, manifest.entrypointCandidates)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

export function readRuntimeManifestEntryPoints(runtimeRoot: string): readonly string[] | null {
  const manifestPath = join(runtimeRoot, 'manifest.json')
  if (!existsSync(manifestPath)) return null

  const raw = readFileSync(manifestPath, 'utf-8')
  const parsed = JSON.parse(raw) as { entrypointCandidates?: string[] }
  return Array.isArray(parsed.entrypointCandidates) && parsed.entrypointCandidates.length > 0
    ? parsed.entrypointCandidates
    : null
}
