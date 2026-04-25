import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { createDatabase, runMigrations, ProjectRepository, TaskRepository } from '@taskhelm/core'

const TEST_DB = path.join(import.meta.dirname, '__test_workspace_route__.db')
let db: ReturnType<typeof createDatabase>
let repoRoot: string

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

  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-workspace-route-'))
  execSync('git init', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: repoRoot, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: repoRoot, stdio: 'pipe' })

  const nestedRepo = path.join(repoRoot, 'packages', 'ui')
  fs.mkdirSync(nestedRepo, { recursive: true })
  execSync('git init', { cwd: nestedRepo, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: nestedRepo, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: nestedRepo, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: nestedRepo, stdio: 'pipe' })

  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db?.close()
  fs.rmSync(repoRoot, { recursive: true, force: true })
  removeTestDb()
})

describe('GET /api/tasks/[taskId]/workspace', () => {
  it('returns persisted settings and detected nested repos', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'Ship auth',
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ taskId: task.id }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      settings: {
        baseBranch: expect.any(String),
        autoPullBaseBranch: true,
        workspaceName: '',
        workspaceBranch: '',
        preferredPort: null,
      },
      availableBaseBranches: expect.arrayContaining([expect.any(String)]),
      detectedSubrepos: [path.join('packages', 'ui')],
    })
  })

  it('returns existing unassigned worktrees under the project worktree root', async () => {
    const worktreeRoot = path.join(repoRoot, '.worktrees')
    fs.mkdirSync(worktreeRoot, { recursive: true })
    execSync('git branch feature/existing', { cwd: repoRoot, stdio: 'pipe' })
    const existingWorktreePath = path.join(worktreeRoot, 'feature-existing')
    execSync(`git worktree add "${existingWorktreePath}" feature/existing`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })

    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
    })

    const attachedTask = taskRepo.create({
      project_id: project.id,
      title: 'Attached',
    })
    taskRepo.update(attachedTask.id, {
      worktree_path: existingWorktreePath,
      branch_name: 'feature/existing',
    })

    execSync('git branch feature/free', { cwd: repoRoot, stdio: 'pipe' })
    const freeWorktreePath = path.join(worktreeRoot, 'feature-free')
    execSync(`git worktree add "${freeWorktreePath}" feature/free`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
    const canonicalFreeWorktreePath = fs.realpathSync.native(freeWorktreePath)

    const { GET } = await import('./route')
    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ taskId: task.id }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      availableExistingWorktrees: [
        {
          path: canonicalFreeWorktreePath,
          branch: 'feature/free',
          name: 'feature-free',
        },
      ],
    })
  })
})

describe('POST /api/tasks/[taskId]/workspace', () => {
  it('rejects a missing base branch before trying to create the workspace', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
      key: 'ALPHA-0',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName: 'alpha-ui',
          workspaceBranch: 'feature/alpha-ui',
          baseBranch: 'typo/base-branch',
          autoPullBaseBranch: false,
          subrepoBranches: [],
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Base branch "typo/base-branch" does not exist',
    })
  })

  it('persists workspace settings and initializes runtime state', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
      key: 'ALPHA-1',
    })

    const current = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName: 'alpha-ui',
          workspaceBranch: 'feature/alpha-ui',
          baseBranch: current,
          autoPullBaseBranch: false,
          subrepoBranches: [{ repoPath: path.join('packages', 'ui'), branch: 'feature/ui' }],
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({
      workspaceName: 'alpha-ui',
      branchName: 'feature/alpha-ui',
      subrepoBranches: [{ repoPath: path.join('packages', 'ui'), branch: 'feature/ui' }],
    })
    expect(fs.existsSync(path.join(payload.worktreePath, 'packages', 'ui', '.git'))).toBe(true)
    expect(
      execSync('git branch --show-current', {
        cwd: path.join(payload.worktreePath, 'packages', 'ui'),
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim(),
    ).toBe('feature/ui')

    expect(taskRepo.findById(task.id)).toMatchObject({
      workspace_name: 'alpha-ui',
      workspace_branch: 'feature/alpha-ui',
      branch_name: 'feature/alpha-ui',
      workspace_subrepo_branches_json: JSON.stringify([
        { repoPath: path.join('packages', 'ui'), branch: 'feature/ui' },
      ]),
    })
  })

  it('rejects duplicate workspace names inside the same project', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const taskRepo = new TaskRepository(db)
    taskRepo.create({
      project_id: project.id,
      title: 'Existing',
      key: 'ALPHA-1',
    })
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
      key: 'ALPHA-2',
    })
    taskRepo.update(task.id, { workspace_name: 'alpha-ui' })

    const nextTask = taskRepo.create({
      project_id: project.id,
      title: 'Second task',
      key: 'ALPHA-3',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName: 'alpha-ui',
          workspaceBranch: 'feature/alpha-ui-2',
          subrepoBranches: [],
        }),
      }),
      { params: Promise.resolve({ taskId: nextTask.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Workspace name already exists in this project',
    })
  })

  it('returns a recoverable error when auto-pull of the base branch fails', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Ship auth',
      key: 'ALPHA-4',
    })
    const current = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName: 'alpha-pull',
          workspaceBranch: 'feature/alpha-pull',
          baseBranch: current,
          autoPullBaseBranch: true,
          subrepoBranches: [],
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'BASE_BRANCH_PULL_FAILED',
      canForceRefresh: true,
      recoverable: true,
    })
  })

  it('attaches an existing unassigned worktree instead of creating a new one', async () => {
    const worktreeRoot = path.join(repoRoot, '.worktrees')
    fs.mkdirSync(worktreeRoot, { recursive: true })
    execSync('git branch feature/existing', { cwd: repoRoot, stdio: 'pipe' })
    const existingWorktreePath = path.join(worktreeRoot, 'feature-existing')
    execSync(`git worktree add "${existingWorktreePath}" feature/existing`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
    const canonicalExistingWorktreePath = fs.realpathSync.native(existingWorktreePath)

    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const taskRepo = new TaskRepository(db)
    const task = taskRepo.create({
      project_id: project.id,
      title: 'Attach me',
      key: 'ALPHA-9',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName: 'existing-ui',
          existingWorktreePath: canonicalExistingWorktreePath,
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      workspaceName: 'existing-ui',
      branchName: 'feature/existing',
      worktreePath: canonicalExistingWorktreePath,
      attachedExistingWorktree: true,
    })

    expect(taskRepo.findById(task.id)).toMatchObject({
      workspace_name: 'existing-ui',
      workspace_branch: 'feature/existing',
      branch_name: 'feature/existing',
      worktree_path: canonicalExistingWorktreePath,
    })
  })

  it('rejects unsafe branch names before running git commands', async () => {
    const project = new ProjectRepository(db).create({
      name: 'Alpha',
      slug: 'alpha',
      local_repo_root: repoRoot,
    })
    const task = new TaskRepository(db).create({
      project_id: project.id,
      title: 'Unsafe branch',
      key: 'ALPHA-10',
    })

    const { POST } = await import('./route')
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName: 'unsafe-ui',
          workspaceBranch: 'feature/"bad"',
          baseBranch: 'main',
          autoPullBaseBranch: false,
          subrepoBranches: [],
        }),
      }),
      { params: Promise.resolve({ taskId: task.id }) },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Branch name contains unsupported characters',
    })
  })
})
