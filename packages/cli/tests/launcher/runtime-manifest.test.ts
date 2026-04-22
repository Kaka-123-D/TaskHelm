import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('runtime manifest resolution', () => {
  it('returns null when no explicit runtime manifest or bundle override is configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { resolveRuntimeManifest } = await import('../../src/launcher/runtime-manifest.js')

    const manifest = await resolveRuntimeManifest('1.2.3')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(manifest).toBeNull()
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
