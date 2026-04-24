import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const originalEnv = { ...process.env }
const childProcessExecFileSync = vi.hoisted(() => vi.fn())

vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    execFileSync: childProcessExecFileSync,
  }
})

beforeEach(() => {
  childProcessExecFileSync.mockReset()
})

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

  it('derives bundled runtime candidates from a packaged root install layout', async () => {
    const { getBundledRuntimeCandidates, getCliPackageRoot } = await import(
      '../../src/launcher/runtime-cache.js'
    )

    expect(getCliPackageRoot().replace(/\\/g, '/')).toMatch(/packages\/cli$/)

    expect(getBundledRuntimeCandidates('/opt/taskhelm/node_modules/@taskhelm/cli')).toContain(
      '/opt/taskhelm/runtime/standalone/packages/web/server.js',
    )
    expect(getBundledRuntimeCandidates('/opt/taskhelm/node_modules/@taskhelm/cli')).toContain(
      '/opt/taskhelm/runtime/standalone/server.js',
    )
  })

  it('resolves the owning taskhelm package root from the installed cli path', async () => {
    const fakeInstallRoot = mkdtempSync(join(tmpdir(), 'taskhelm-install-layout-'))
    const taskhelmRoot = join(fakeInstallRoot, 'taskhelm')
    const cliRoot = join(taskhelmRoot, 'node_modules', '@taskhelm', 'cli')
    mkdirSync(cliRoot, { recursive: true })
    writeFileSync(join(taskhelmRoot, 'package.json'), JSON.stringify({ name: 'taskhelm' }))
    writeFileSync(join(cliRoot, 'package.json'), JSON.stringify({ name: '@taskhelm/cli' }))

    const { getTaskHelmPackageRoot } = await import('../../src/launcher/runtime-cache.js')

    expect(getTaskHelmPackageRoot(cliRoot)).toBe(taskhelmRoot)
    expect(getTaskHelmPackageRoot('/packages/cli')).toBeNull()

    rmSync(fakeInstallRoot, { recursive: true, force: true })
  })

  it('installs a runtime bundle from an explicit archive override when bundled runtime is disabled', async () => {
    const { execFileSync: actualExecFileSync } = await vi.importActual<typeof import('node:child_process')>(
      'node:child_process'
    )
    childProcessExecFileSync.mockImplementation((command, args, options) => {
      if (command === 'tar') {
        return actualExecFileSync(command, args, options)
      }

      return Buffer.from('')
    })
    const sourceRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-source-'))
    const archiveRoot = mkdtempSync(join(tmpdir(), 'taskhelm-runtime-archive-'))
    const runtimeRoot = join(sourceRoot, 'standalone', 'packages', 'web')
    const entrypoint = join(runtimeRoot, 'server.js')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(entrypoint, 'console.log("runtime")')

    const archivePath = join(archiveRoot, 'taskhelm-runtime.tgz')
    actualExecFileSync('tar', ['-czf', archivePath, 'standalone'], { cwd: sourceRoot })

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

  it('prepares a local runtime from the installed taskhelm package when no prebuilt runtime or remote override exists', async () => {
    const taskhelmHome = mkdtempSync(join(tmpdir(), 'taskhelm-home-'))
    const version = '7.7.7'
    const runtimeRoot = join(taskhelmHome, 'runtime', version)
    process.env.TASKHELM_HOME = taskhelmHome
    process.env.TASKHELM_DISABLE_BUNDLED_RUNTIME = '1'
    delete process.env.TASKHELM_RUNTIME_BUNDLE_URL
    delete process.env.TASKHELM_RUNTIME_MANIFEST_URL

    childProcessExecFileSync.mockImplementation((_cmd, args) => {
      const runtimeArgIndex = args.indexOf('--runtime-root')
      const targetRuntimeRoot = String(args[runtimeArgIndex + 1])
      const entrypoint = join(targetRuntimeRoot, 'packages', 'web', 'server.js')
      mkdirSync(join(targetRuntimeRoot, 'packages', 'web'), { recursive: true })
      writeFileSync(entrypoint, 'console.log("runtime")')
      writeFileSync(
        join(targetRuntimeRoot, 'manifest.json'),
        JSON.stringify({ entrypointCandidates: ['packages/web/server.js'] }),
      )
      return Buffer.from('')
    })

    const { ensureRuntime, getTaskHelmPackageRoot } = await import('../../src/launcher/runtime-cache.js')

    const packageRoot = getTaskHelmPackageRoot()
    expect(packageRoot).toBeTruthy()
    expect(readFileSync(join(packageRoot!, 'package.json'), 'utf-8')).toContain('"name": "taskhelm"')

    await expect(ensureRuntime(version)).resolves.toBe(join(runtimeRoot, 'packages', 'web', 'server.js'))

    expect(childProcessExecFileSync).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining([
        expect.stringMatching(/prepare-installed-runtime\.mjs$/),
        '--runtime-root',
        runtimeRoot,
        '--version',
        version,
      ]),
      expect.objectContaining({
        stdio: 'inherit',
        env: expect.objectContaining({ NEXT_TELEMETRY_DISABLED: '1' }),
      }),
    )

    rmSync(taskhelmHome, { recursive: true, force: true })
  })

  it('treats a cached runtime with manifest entrypoints as ready on subsequent launches', async () => {
    const taskhelmHome = mkdtempSync(join(tmpdir(), 'taskhelm-home-ready-'))
    const version = '8.8.8'
    const runtimeRoot = join(taskhelmHome, 'runtime', version)
    const runtimeEntrypoint = join(runtimeRoot, 'standalone', 'packages', 'web', 'server.js')

    mkdirSync(join(runtimeRoot, 'standalone', 'packages', 'web'), { recursive: true })
    writeFileSync(runtimeEntrypoint, 'console.log("runtime")')
    writeFileSync(
      join(runtimeRoot, 'manifest.json'),
      JSON.stringify({ entrypointCandidates: ['standalone/packages/web/server.js'] }),
    )

    process.env.TASKHELM_HOME = taskhelmHome
    process.env.TASKHELM_DISABLE_BUNDLED_RUNTIME = '1'

    const { ensureRuntime, isRuntimeReady } = await import('../../src/launcher/runtime-cache.js')

    expect(isRuntimeReady(version)).toBe(true)
    await expect(ensureRuntime(version)).resolves.toBe(runtimeEntrypoint)
    expect(childProcessExecFileSync).not.toHaveBeenCalled()

    rmSync(taskhelmHome, { recursive: true, force: true })
  })
})
