import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { parse } from 'yaml'
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
  max_active_dev_servers: 1,
  created_at: '2026-04-11T10:00:00.000Z',
  updated_at: '2026-04-11T10:00:00.000Z',
}

const baseTask: Task = {
  id: 'task-abc123',
  project_id: 'proj-001',
  key: 'TASK-1',
  title: 'Implement feature X',
  goal: 'Add X functionality',
  refer_link: 'https://github.com/org/repo/issues/1',
  priority: 3,
  branch_name: 'feature/task-abc123',
  workspace_name: null,
  workspace_branch: null,
  workspace_subrepo_branches_json: null,
  preferred_port: null,
  worktree_path: '/home/user/worktrees/task-abc123',
  port: 3001,
  dev_server_state: null,
  context_vault_root_path: null,
  context_vault_sources_json: null,
  context_vault_files_json: null,
  context_vault_selected_file: null,
  latest_blocker: null,
  created_at: '2026-04-11T10:00:00.000Z',
  updated_at: '2026-04-11T10:00:00.000Z',
}

const tempDirs: string[] = []

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-test-'))
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

describe('writeCapsule', () => {
  it('returns the correct capsule directory path', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })
    const expected = path.join(baseDir, 'projects', 'my-project', 'tasks', 'task-abc123')
    expect(capsuleDir).toBe(expected)
  })

  it('creates the correct directory structure', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    expect(fs.existsSync(capsuleDir)).toBe(true)
    expect(fs.statSync(capsuleDir).isDirectory()).toBe(true)
  })

  it('creates the artifacts/ subdirectory', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const artifactsDir = path.join(capsuleDir, 'artifacts')
    expect(fs.existsSync(artifactsDir)).toBe(true)
    expect(fs.statSync(artifactsDir).isDirectory()).toBe(true)
  })

  it('writes task.yaml with correct content', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const yamlPath = path.join(capsuleDir, 'task.yaml')
    expect(fs.existsSync(yamlPath)).toBe(true)

    const content = fs.readFileSync(yamlPath, 'utf-8')
    const parsed = parse(content)

    expect(parsed.id).toBe(baseTask.id)
    expect(parsed.project_slug).toBe('my-project')
    expect(parsed.title).toBe(baseTask.title)
    expect(parsed.status).toBeUndefined()
    expect(parsed.phase).toBeUndefined()
    expect(parsed.priority).toBe(baseTask.priority)
    expect(parsed.branch_name).toBe(baseTask.branch_name)
    expect(parsed.worktree_path).toBe(baseTask.worktree_path)
    expect(parsed.port).toBe(baseTask.port)
    expect(parsed.goal).toBe(baseTask.goal)
    expect(parsed.referLink).toBe(baseTask.refer_link)
    expect(parsed.source).toBeUndefined()
    expect(parsed.updated_at).toBe(baseTask.updated_at)
  })

  it('task.yaml is valid YAML parseable without error', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const yamlPath = path.join(capsuleDir, 'task.yaml')
    const content = fs.readFileSync(yamlPath, 'utf-8')
    expect(() => parse(content)).not.toThrow()
  })

  it('writes context.md with correct headings', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const mdPath = path.join(capsuleDir, 'context.md')
    expect(fs.existsSync(mdPath)).toBe(true)

    const content = fs.readFileSync(mdPath, 'utf-8')
    expect(content).toContain('Source')
    expect(content).toContain('Scope')
    expect(content).toContain('Assumptions')
    expect(content).toContain('Out of Scope')
  })

  it('writes plan.md with correct headings', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const mdPath = path.join(capsuleDir, 'plan.md')
    expect(fs.existsSync(mdPath)).toBe(true)

    const content = fs.readFileSync(mdPath, 'utf-8')
    expect(content).toContain('Requirements')
    expect(content).toContain('Implementation Plan')
    expect(content).toContain('Verification Checklist')
    expect(content).toContain('Open Questions')
  })

  it('writes handoff.md with correct headings', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const mdPath = path.join(capsuleDir, 'handoff.md')
    expect(fs.existsSync(mdPath)).toBe(true)

    const content = fs.readFileSync(mdPath, 'utf-8')
    expect(content).toContain('Current Status')
    expect(content).toContain('What Changed')
    expect(content).toContain('Blockers')
    expect(content).toContain('Next Action')
  })

  it('writes review.md with correct headings', () => {
    const baseDir = createTempDir()
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: baseTask, project: baseProject })

    const mdPath = path.join(capsuleDir, 'review.md')
    expect(fs.existsSync(mdPath)).toBe(true)

    const content = fs.readFileSync(mdPath, 'utf-8')
    expect(content).toContain('Spec Compliance')
    expect(content).toContain('Code Quality')
    expect(content).toContain('Runtime Verification')
    expect(content).toContain('Recommendation')
  })

  it('omits null fields from task.yaml', () => {
    const baseDir = createTempDir()
    const minimalTask: Task = {
      ...baseTask,
      goal: null,
      refer_link: null,
      branch_name: null,
      worktree_path: null,
      port: null,
    }
    const capsuleDir = writeCapsule({ baseDir, projectSlug: 'my-project', task: minimalTask, project: baseProject })

    const content = fs.readFileSync(path.join(capsuleDir, 'task.yaml'), 'utf-8')
    const parsed = parse(content)
    expect(parsed.goal).toBeUndefined()
    expect(parsed.referLink).toBeUndefined()
    expect(parsed.branch_name).toBeUndefined()
    expect(parsed.worktree_path).toBeUndefined()
    expect(parsed.port).toBeUndefined()
  })
})
