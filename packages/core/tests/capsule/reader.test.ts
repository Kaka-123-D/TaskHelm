import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { stringify } from 'yaml'
import { readCapsule, readCapsuleRaw } from '../../src/capsule/reader.js'
import { writeCapsule } from '../../src/capsule/writer.js'
import type { Task, Project } from '../../src/types.js'

const baseProject: Project = {
  id: 'proj-001',
  slug: 'my-project',
  name: 'My Project',
  description: null,
  local_repo_root: '/home/user/my-project',
  default_branch: 'main',
  branch_naming_pattern: null,
  worktree_root: null,
  dev_command: null,
  install_command: null,
  test_command: null,
  max_active_dev_servers: 1,
  specdown_mode: 'disabled',
  specdown_project_ref: null,
  created_at: '2026-04-11T10:00:00.000Z',
  updated_at: '2026-04-11T10:00:00.000Z',
}

const baseTask: Task = {
  id: 'task-abc123',
  project_id: 'proj-001',
  key: 'TASK-1',
  title: 'Implement feature X',
  goal: 'Add X functionality',
  source_type: 'github_issue',
  source_ref: 'https://github.com/org/repo/issues/1',
  status: 'ready',
  phase: 'planning',
  priority: 3,
  branch_name: 'feature/task-abc123',
  worktree_path: '/home/user/worktrees/task-abc123',
  port: 3001,
  dev_server_state: null,
  current_agent_run_id: null,
  latest_blocker: null,
  created_at: '2026-04-11T10:00:00.000Z',
  updated_at: '2026-04-11T10:00:00.000Z',
}

const tempDirs: string[] = []

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-reader-test-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {}
  }
})

describe('readCapsule', () => {
  it('reads back a capsule written by writeCapsule', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const capsule = readCapsule(capsuleDir)

    expect(capsule.id).toBe(baseTask.id)
    expect(capsule.project_slug).toBe('my-project')
    expect(capsule.title).toBe(baseTask.title)
    expect(capsule.status).toBe(baseTask.status)
    expect(capsule.phase).toBe(baseTask.phase)
    expect(capsule.priority).toBe(baseTask.priority)
    expect(capsule.branch_name).toBe(baseTask.branch_name)
    expect(capsule.worktree_path).toBe(baseTask.worktree_path)
    expect(capsule.port).toBe(baseTask.port)
    expect(capsule.goal).toBe(baseTask.goal)
    expect(capsule.source?.type).toBe(baseTask.source_type)
    expect(capsule.source?.ref).toBe(baseTask.source_ref)
    expect(capsule.updated_at).toBe(baseTask.updated_at)
  })

  it('returns a validated TaskCapsule object with correct types', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const capsule = readCapsule(capsuleDir)

    expect(typeof capsule.id).toBe('string')
    expect(typeof capsule.project_slug).toBe('string')
    expect(typeof capsule.title).toBe('string')
    expect(typeof capsule.priority).toBe('number')
    expect(typeof capsule.updated_at).toBe('string')
  })

  it('throws a descriptive error when task.yaml is missing', () => {
    const baseDir = createTempDir()
    const emptyDir = path.join(baseDir, 'empty-capsule')
    fs.mkdirSync(emptyDir)

    expect(() => readCapsule(emptyDir)).toThrow()
    try {
      readCapsule(emptyDir)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/task\.yaml/)
    }
  })

  it('throws a descriptive error when task.yaml has invalid YAML content', () => {
    const baseDir = createTempDir()
    const capsuleDir = path.join(baseDir, 'bad-capsule')
    fs.mkdirSync(capsuleDir)
    fs.writeFileSync(path.join(capsuleDir, 'task.yaml'), ': invalid: yaml: {{{', 'utf-8')

    expect(() => readCapsule(capsuleDir)).toThrow()
  })

  it('throws a descriptive error when task.yaml fails schema validation', () => {
    const baseDir = createTempDir()
    const capsuleDir = path.join(baseDir, 'invalid-capsule')
    fs.mkdirSync(capsuleDir)

    const invalidData = {
      id: 'task-001',
      project_slug: 'my-project',
      title: 'Test',
      status: 'not_a_valid_status',
      phase: 'context',
      updated_at: '2026-04-11T10:00:00.000Z',
    }
    fs.writeFileSync(path.join(capsuleDir, 'task.yaml'), stringify(invalidData), 'utf-8')

    expect(() => readCapsule(capsuleDir)).toThrow()
    try {
      readCapsule(capsuleDir)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/validation/i)
    }
  })
})

describe('readCapsuleRaw', () => {
  it('returns the raw parsed YAML without validation', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const raw = readCapsuleRaw(capsuleDir)

    expect(raw).toBeDefined()
    expect(typeof raw).toBe('object')
    expect((raw as Record<string, unknown>).id).toBe(baseTask.id)
  })

  it('returns unknown type (not validated)', () => {
    const baseDir = createTempDir()
    const capsuleDir = path.join(baseDir, 'raw-capsule')
    fs.mkdirSync(capsuleDir)

    const arbitraryData = { foo: 'bar', nested: { x: 1 }, list: [1, 2, 3] }
    fs.writeFileSync(path.join(capsuleDir, 'task.yaml'), stringify(arbitraryData), 'utf-8')

    const raw = readCapsuleRaw(capsuleDir)
    expect((raw as Record<string, unknown>).foo).toBe('bar')
  })

  it('throws when task.yaml is missing', () => {
    const baseDir = createTempDir()
    const emptyDir = path.join(baseDir, 'empty')
    fs.mkdirSync(emptyDir)

    expect(() => readCapsuleRaw(emptyDir)).toThrow()
  })
})
