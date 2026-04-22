export type ContextVaultFileCategory = 'markdown' | 'text' | 'image' | 'video' | 'unsupported'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])
const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.json',
  '.yml',
  '.yaml',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.html',
  '.xml',
  '.sh',
  '.bash',
  '.zsh',
  '.env',
  '.log',
  '.toml',
  '.ini',
  '.sql',
  '.csv',
])
const IMAGE_EXTENSIONS = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
])
const VIDEO_EXTENSIONS = new Map<string, string>([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.mov', 'video/quicktime'],
  ['.m4v', 'video/x-m4v'],
])

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase()
}

export function classifyContextVaultFile(filename: string): {
  readonly category: ContextVaultFileCategory
  readonly mediaType: string
} {
  const extension = getExtension(filename)

  if (MARKDOWN_EXTENSIONS.has(extension)) {
    return { category: 'markdown', mediaType: 'text/markdown' }
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return { category: 'text', mediaType: 'text/plain' }
  }

  const imageMediaType = IMAGE_EXTENSIONS.get(extension)
  if (imageMediaType) {
    return { category: 'image', mediaType: imageMediaType }
  }

  const videoMediaType = VIDEO_EXTENSIONS.get(extension)
  if (videoMediaType) {
    return { category: 'video', mediaType: videoMediaType }
  }

  return { category: 'unsupported', mediaType: 'application/octet-stream' }
}

export function supportedContextVaultFile(filename: string): boolean {
  return classifyContextVaultFile(filename).category !== 'unsupported'
}
