import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_context_vault_route__.db')
let db: ReturnType<typeof createDatabase>
let vaultRoot: string

vi.mock('@/lib/db', () => ({
  getDb: () => db,
}))

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
  vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-vault-route-'))
})

afterEach(() => {
  db.close()
  fs.rmSync(vaultRoot, { recursive: true, force: true })
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

describe('PATCH /api/tasks/[taskId]/context-vault', () => {
  it('persists the selected vault files on the task record', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })

    const { PATCH } = await import('./route')
    const response = await PATCH(
      new Request('http://localhost/api/tasks/task-1/context-vault', {
        method: 'PATCH',
        body: JSON.stringify({
          rootPath: '/tmp/vault-root',
          sources: ['/tmp/vault-root'],
          files: [
            {
              relativePath: 'guides/context.md',
              absolutePath: '/tmp/vault-root/guides/context.md',
              content: '# Context\n',
            },
          ],
          selectedFile: 'guides/context.md',
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      rootPath: '/tmp/vault-root',
      selectedFile: 'guides/context.md',
    })

    expect(taskRepo.findById(task.id)).toMatchObject({
      context_vault_root_path: '/tmp/vault-root',
      context_vault_selected_file: 'guides/context.md',
    })
  })

  it('updates only the selected file without wiping the existing vault snapshot', async () => {
    const markdownPath = path.join(vaultRoot, 'context.md')
    const imagePath = path.join(vaultRoot, 'diagram.png')
    fs.writeFileSync(markdownPath, '# Context\n')
    fs.writeFileSync(imagePath, 'png-bits')

    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })

    taskRepo.update(task.id, {
      context_vault_root_path: vaultRoot,
      context_vault_sources_json: JSON.stringify([vaultRoot]),
      context_vault_files_json: JSON.stringify([
        {
          relativePath: 'context.md',
          absolutePath: markdownPath,
          content: '# Context\n',
        },
        {
          relativePath: 'diagram.png',
          absolutePath: imagePath,
          content: null,
          category: 'image',
          mediaType: 'image/png',
        },
      ]),
      context_vault_selected_file: 'context.md',
    })

    const { PATCH } = await import('./route')
    const response = await PATCH(
      new Request('http://localhost/api/tasks/task-1/context-vault', {
        method: 'PATCH',
        body: JSON.stringify({
          selectedFile: 'diagram.png',
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      rootPath: vaultRoot,
      selectedFile: 'diagram.png',
      files: [
        { relativePath: 'context.md' },
        { relativePath: 'diagram.png' },
      ],
    })

    expect(taskRepo.findById(task.id)).toMatchObject({
      context_vault_root_path: vaultRoot,
      context_vault_selected_file: 'diagram.png',
    })
    expect(JSON.parse(taskRepo.findById(task.id)?.context_vault_files_json ?? '[]')).toHaveLength(2)
  })
})

describe('GET /api/tasks/[taskId]/context-vault', () => {
  it('re-reads the current local markdown content from saved source paths', async () => {
    const markdownPath = path.join(vaultRoot, 'context.md')
    fs.writeFileSync(markdownPath, '# Old Context\n')

    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: '/repo/alpha',
    })

    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })

    taskRepo.update(task.id, {
      context_vault_root_path: vaultRoot,
      context_vault_sources_json: JSON.stringify([markdownPath]),
      context_vault_files_json: JSON.stringify([
        {
          relativePath: 'context.md',
          absolutePath: markdownPath,
          content: '# Old Context\n',
        },
      ]),
      context_vault_selected_file: 'context.md',
    })

    fs.writeFileSync(markdownPath, '# Fresh Context\n')

    const { GET } = await import('./route')
    const response = await GET(
      new Request('http://localhost/api/tasks/task-1/context-vault'),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      rootPath: vaultRoot,
      selectedFile: 'context.md',
      files: [
        {
          relativePath: 'context.md',
          absolutePath: markdownPath,
          content: '# Fresh Context\n',
        },
      ],
    })
  })
})
