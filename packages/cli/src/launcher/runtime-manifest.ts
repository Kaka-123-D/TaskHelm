export interface RuntimeManifest {
  readonly version: string
  readonly bundleUrl: string
  readonly sha256?: string
  readonly entrypointCandidates: readonly string[]
}

const DEFAULT_ENTRYPOINT_CANDIDATES = ['standalone/packages/web/server.js', 'standalone/server.js'] as const

function normalizeEntrypoints(input: string | readonly string[] | undefined): readonly string[] {
  if (!input) return DEFAULT_ENTRYPOINT_CANDIDATES

  let values: readonly string[]
  if (typeof input === 'string') {
    values = input.split(',')
  } else {
    values = input
  }

  const normalized = values.map((value: string) => value.trim()).filter(Boolean)
  return normalized.length > 0 ? normalized : DEFAULT_ENTRYPOINT_CANDIDATES
}

export function getRuntimeManifestOverride(version: string): RuntimeManifest | null {
  const bundleUrl = process.env.TASKHELM_RUNTIME_BUNDLE_URL?.trim()
  if (!bundleUrl) return null

  return {
    version,
    bundleUrl,
    sha256: process.env.TASKHELM_RUNTIME_BUNDLE_SHA256?.trim() || undefined,
    entrypointCandidates: normalizeEntrypoints(process.env.TASKHELM_RUNTIME_ENTRYPOINTS),
  }
}

function resolveManifestUrl(version: string): string | null {
  const template = process.env.TASKHELM_RUNTIME_MANIFEST_URL?.trim()
  if (!template) return null

  return template.includes('{version}') ? template.replaceAll('{version}', version) : template
}

export async function fetchRuntimeManifest(version: string): Promise<RuntimeManifest | null> {
  const url = resolveManifestUrl(version)
  if (!url) return null

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TaskHelm runtime manifest request failed with ${response.status} for ${url}`)
  }

  const manifest = (await response.json()) as Partial<RuntimeManifest>
  if (typeof manifest.bundleUrl !== 'string' || manifest.bundleUrl.trim().length === 0) {
    throw new Error('TaskHelm runtime manifest is missing bundleUrl')
  }

  return {
    version,
    bundleUrl: manifest.bundleUrl,
    sha256: typeof manifest.sha256 === 'string' && manifest.sha256.length > 0 ? manifest.sha256 : undefined,
    entrypointCandidates: normalizeEntrypoints(manifest.entrypointCandidates),
  }
}

export async function resolveRuntimeManifest(version: string): Promise<RuntimeManifest | null> {
  return getRuntimeManifestOverride(version) ?? fetchRuntimeManifest(version)
}
