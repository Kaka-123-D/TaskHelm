import { NextResponse } from 'next/server'
import * as fs from 'node:fs'
import { Readable } from 'node:stream'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import { classifyContextVaultFile } from '@/lib/context-vault/file-preview'
import {
  authorizeServePath,
  FileServeAuthorizationError,
} from '@/lib/context-vault/serve-authz'

/**
 * GET /api/files/serve?taskId=<id>&path=<absolute>
 *
 * Streams the bytes of a context vault file so the browser can render it
 * via plain `<img src>` / `<video src>` tags instead of base64 data URLs.
 * Refuses any path that does not fall under one of the task's registered
 * context vault source roots.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')
    const requestedPath = url.searchParams.get('path')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }
    if (!requestedPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    const task = new TaskRepository(getDb()).findById(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let authorized
    try {
      authorized = authorizeServePath(task, requestedPath)
    } catch (error) {
      if (error instanceof FileServeAuthorizationError) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      throw error
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(authorized.canonicalPath)
    } catch {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Path is not a file' }, { status: 400 })
    }

    const preview = classifyContextVaultFile(authorized.canonicalPath)
    const contentType =
      preview.category === 'markdown' || preview.category === 'text'
        ? `${preview.mediaType}; charset=utf-8`
        : preview.mediaType
    const etag = `W/"${stat.size}-${stat.mtimeMs.toString(36)}"`

    // Honour conditional requests so the browser can cache previews
    // between renders without re-downloading every poll cycle.
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { etag } })
    }

    const nodeStream = fs.createReadStream(authorized.canonicalPath)
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'content-type': contentType,
        'content-length': String(stat.size),
        'cache-control': 'private, max-age=0, must-revalidate',
        etag,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
