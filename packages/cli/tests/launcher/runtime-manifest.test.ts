import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('runtime manifest resolution', () => {
  it('uses the default manifest URL template when no env override is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bundleUrl: 'https://downloads.example.com/taskhelm-runtime.tgz' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { DEFAULT_RUNTIME_MANIFEST_URL, resolveRuntimeManifest } = await import(
      '../../src/launcher/runtime-manifest.js'
    )

    const manifest = await resolveRuntimeManifest('1.2.3')

    expect(fetchMock).toHaveBeenCalledWith(
      DEFAULT_RUNTIME_MANIFEST_URL.replace('{version}', '1.2.3'),
    )
    expect(manifest?.bundleUrl).toBe('https://downloads.example.com/taskhelm-runtime.tgz')
  })

  it('prefers explicit env manifest URL over the default template', async () => {
    process.env.TASKHELM_RUNTIME_MANIFEST_URL = 'https://custom.example.com/{version}.json'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bundleUrl: 'https://downloads.example.com/taskhelm-runtime.tgz' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { resolveRuntimeManifest } = await import('../../src/launcher/runtime-manifest.js')

    await resolveRuntimeManifest('9.9.9')

    expect(fetchMock).toHaveBeenCalledWith('https://custom.example.com/9.9.9.json')
  })
})
