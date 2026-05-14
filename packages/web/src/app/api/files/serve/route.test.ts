import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
} from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_files_serve_route__.db')
let db: ReturnType<typeof createDatabase>
let root: string

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

function removeTestDb(): void {
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
}

beforeEach(() => {
  removeTestDb()
  root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-serve-')),
  )
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db?.close()
  removeTestDb()
  fs.rmSync(root, { recursive: true, force: true })
})

function makeProjectAndTask(sources: readonly string[]) {
  const project = new ProjectRepository(db).create({
    name: 'P',
    slug: 'p',
    local_repo_root: root,
  })
  const taskRepo = new TaskRepository(db)
  const task = taskRepo.create({ project_id: project.id, title: 'T' })
  taskRepo.update(task.id, {
    context_vault_sources_json: JSON.stringify(sources),
  })
  return task
}

describe('GET /api/files/serve', () => {
  it('streams an authorised file with the right content-type', async () => {
    const target = path.join(root, 'image.png')
    fs.writeFileSync(target, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const task = makeProjectAndTask([root])

    const { GET } = await import('./route')
    const response = await GET(
      new Request(
        `http://localhost/api/files/serve?taskId=${task.id}&path=${encodeURIComponent(target)}`,
      ),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-length')).toBe('8')
    const buffer = Buffer.from(await response.arrayBuffer())
    expect(buffer.slice(0, 4).toString('hex')).toBe('89504e47')
  })

  it('returns 304 on matching If-None-Match', async () => {
    const target = path.join(root, 'doc.md')
    fs.writeFileSync(target, '# title')
    const task = makeProjectAndTask([root])

    const { GET } = await import('./route')
    const first = await GET(
      new Request(
        `http://localhost/api/files/serve?taskId=${task.id}&path=${encodeURIComponent(target)}`,
      ),
    )
    const etag = first.headers.get('etag')
    expect(etag).toBeTruthy()

    const second = await GET(
      new Request(
        `http://localhost/api/files/serve?taskId=${task.id}&path=${encodeURIComponent(target)}`,
        { headers: { 'If-None-Match': etag! } },
      ),
    )
    expect(second.status).toBe(304)
  })

  it('rejects an unauthorised path with 403', async () => {
    const target = path.join(root, 'allowed.txt')
    fs.writeFileSync(target, 'ok')
    const task = makeProjectAndTask([target]) // source is the specific file

    const sneakyPath = '/etc/hosts'
    const { GET } = await import('./route')
    const response = await GET(
      new Request(
        `http://localhost/api/files/serve?taskId=${task.id}&path=${encodeURIComponent(sneakyPath)}`,
      ),
    )
    expect(response.status).toBe(403)
  })

  it('returns 404 when the task is unknown', async () => {
    const { GET } = await import('./route')
    const response = await GET(
      new Request(
        `http://localhost/api/files/serve?taskId=nope&path=${encodeURIComponent(path.join(root, 'x.png'))}`,
      ),
    )
    expect(response.status).toBe(404)
  })

  it('returns 404 when the file is gone from disk', async () => {
    const target = path.join(root, 'ghost.png')
    fs.writeFileSync(target, Buffer.from([0]))
    const task = makeProjectAndTask([root])
    fs.unlinkSync(target)

    const { GET } = await import('./route')
    const response = await GET(
      new Request(
        `http://localhost/api/files/serve?taskId=${task.id}&path=${encodeURIComponent(target)}`,
      ),
    )
    expect(response.status).toBe(404)
  })

  it('returns 400 when path or taskId is missing', async () => {
    const { GET } = await import('./route')
    const noTaskId = await GET(
      new Request(`http://localhost/api/files/serve?path=${encodeURIComponent('/tmp/x')}`),
    )
    expect(noTaskId.status).toBe(400)

    const task = makeProjectAndTask([root])
    const noPath = await GET(
      new Request(`http://localhost/api/files/serve?taskId=${task.id}`),
    )
    expect(noPath.status).toBe(400)
  })
})
