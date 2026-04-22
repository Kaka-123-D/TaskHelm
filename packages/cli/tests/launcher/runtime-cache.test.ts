import { afterEach, describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.resetModules()
})

describe('runtime cache helpers', () => {
  it('resolves versioned runtime paths inside TASKHELM_HOME', async () => {
    process.env.TASKHELM_HOME = '/tmp/taskhelm-home'
    const { getRuntimeRoot, getRuntimeEntrypoint } = await import('../../src/launcher/runtime-cache.js')

    expect(getRuntimeRoot('1.2.3')).toBe('/tmp/taskhelm-home/runtime/1.2.3')
    expect(getRuntimeEntrypoint('1.2.3')).toBe('/tmp/taskhelm-home/runtime/1.2.3/packages/web/server.js')
  })

  it('prefers an explicit bundled runtime entrypoint from env', async () => {
    const bundledRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-bundled-'))
    const entrypoint = join(bundledRoot, 'server.js')
    writeFileSync(entrypoint, 'console.log("runtime")')
    process.env.TASKHELM_BUNDLED_RUNTIME_ENTRYPOINT = entrypoint

    const { getBundledRuntimeEntrypoint } = await import('../../src/launcher/runtime-cache.js')

    expect(getBundledRuntimeEntrypoint()).toBe(entrypoint)
  })

  it('installs a runtime bundle from an explicit archive override when bundled runtime is disabled', async () => {
    const sourceRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-source-'))
    const archiveRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-archive-'))
    const runtimeRoot = join(sourceRoot, 'standalone', 'packages', 'web')
    const entrypoint = join(runtimeRoot, 'server.js')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(entrypoint, 'console.log("runtime")')

    const archivePath = join(archiveRoot, 'taskhelm-runtime.tgz')
    execFileSync('tar', ['-czf', archivePath, 'standalone'], { cwd: sourceRoot })

    const sha256 = createHash('sha256').update(readFileSync(archivePath)).digest('hex')
    const taskhelmHome = mkdtempSync(join(tmpdir(), 'taskhelm-home-'))

    process.env.TASKHELM_HOME = taskhelmHome
    process.env.TASKHELM_DISABLE_BUNDLED_RUNTIME = '1'
    process.env.TASKHELM_RUNTIME_BUNDLE_URL = archivePath
    process.env.TASKHELM_RUNTIME_BUNDLE_SHA256 = sha256
    process.env.TASKHELM_RUNTIME_ENTRYPOINTS = 'standalone/packages/web/server.js'

    const { ensureRuntime } = await import('../../src/launcher/runtime-cache.js')

    await expect(ensureRuntime('9.9.9')).resolves.toBe(
      join(taskhelmHome, 'runtime', '9.9.9', 'standalone', 'packages', 'web', 'server.js'),
    )
  })
})
