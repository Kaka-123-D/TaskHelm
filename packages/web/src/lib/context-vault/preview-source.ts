import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'

/**
 * Build a URL the browser can plug into `<img src>` / `<video src>`
 * (or `fetch` for text). Honours three sources in this order:
 *
 *   1. Legacy `file.content` — a data URL or inline string baked into the
 *      DB row from before the serve-route refactor. Returned verbatim so
 *      pre-existing tasks keep rendering with no migration step.
 *   2. A native-picker blob URL (e.g. `URL.createObjectURL(handle.getFile())`)
 *      indexed by `relativePath`. The native picker hands us a file handle
 *      that the server can't reach, so previews are blob-only.
 *   3. The serve route at `/api/files/serve?taskId=&path=`. This is the
 *      default for manual-fallback selections — the server streams bytes
 *      on demand instead of base64-stuffing them into JSON.
 */
export function resolvePreviewSrc(
  file: PersistedContextVaultFile,
  options: {
    readonly taskId: string
    readonly blobUrls?: ReadonlyMap<string, string>
    /**
     * Increment to force the browser to re-issue a conditional GET. The
     * value is folded into the query string of the serve URL only — legacy
     * `data:` content and `blob:` native URLs are returned untouched so we
     * don't accidentally invalidate them.
     */
    readonly refreshKey?: number
  },
): string | null {
  if (file.content) {
    return file.content
  }

  const blob = options.blobUrls?.get(file.relativePath)
  if (blob) {
    return blob
  }

  if (!file.absolutePath) {
    return null
  }

  const params = new URLSearchParams({
    taskId: options.taskId,
    path: file.absolutePath,
  })
  if (options.refreshKey !== undefined && options.refreshKey > 0) {
    params.set('v', String(options.refreshKey))
  }
  return `/api/files/serve?${params.toString()}`
}
