import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import { TaskRepository } from '../../src/models/task.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_task__.db')
let db: Database.Database

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

function createTestProject(db: Database.Database) {
  return new ProjectRepository(db).create({
    name: 'Test Project',
    slug: 'test-project',
    local_repo_root: '/home/user/test',
  })
}

describe('TaskRepository', () => {
  describe('create + findById', () => {
    it('creates a task with defaults and retrieves it by id', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)

      const task = repo.create({
        project_id: project.id,
        title: 'My First Task',
      })

      expect(task.id).toBeTruthy()
      expect(task.project_id).toBe(project.id)
      expect(task.title).toBe('My First Task')
      expect(task).not.toHaveProperty('status')
      expect(task).not.toHaveProperty('phase')
      expect(task.priority).toBe(0)
      expect(task.key).toBeNull()
      expect(task.goal).toBeNull()
      expect(task.branch_name).toBeNull()
      expect(task.workspace_name).toBeNull()
      expect(task.workspace_branch).toBeNull()
      expect(task.workspace_subrepo_branches_json).toBeNull()
      expect(task.preferred_port).toBeNull()
      expect(task.context_vault_root_path).toBeNull()
      expect(task.context_vault_files_json).toBeNull()
      expect(task.context_vault_selected_file).toBeNull()
      expect(task.created_at).toBeTruthy()
      expect(task.updated_at).toBeTruthy()

      const found = repo.findById(task.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(task.id)
      expect(found!.title).toBe('My First Task')
    })

    it('returns null for unknown id', () => {
      const repo = new TaskRepository(db)
      expect(repo.findById('nonexistent')).toBeNull()
    })

    it('creates a task with optional fields', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)

      const task = repo.create({
        project_id: project.id,
        title: 'Full Task',
        key: 'TASK-001',
        goal: 'Implement feature X',
        refer_link: 'https://github.com/org/repo/issues/1',
        priority: 5,
      })

      expect(task.key).toBe('TASK-001')
      expect(task.goal).toBe('Implement feature X')
      expect(task.refer_link).toBe('https://github.com/org/repo/issues/1')
      expect(task).not.toHaveProperty('source_type')
      expect(task).not.toHaveProperty('source_ref')
      expect(task.priority).toBe(5)
    })
  })

  describe('findByProjectId', () => {
    it('returns all tasks for a project', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)

      repo.create({ project_id: project.id, title: 'Task A' })
      repo.create({ project_id: project.id, title: 'Task B' })
      repo.create({ project_id: project.id, title: 'Task C' })

      const tasks = repo.findByProjectId(project.id)
      expect(tasks.length).toBe(3)
      expect(tasks.map((t) => t.title).sort()).toEqual(['Task A', 'Task B', 'Task C'])
    })

    it('returns empty array when project has no tasks', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)
      expect(repo.findByProjectId(project.id)).toEqual([])
    })

    it('does not return tasks from other projects', () => {
      const project1 = new ProjectRepository(db).create({
        name: 'Project 1',
        slug: 'project-1',
        local_repo_root: '/p1',
      })
      const project2 = new ProjectRepository(db).create({
        name: 'Project 2',
        slug: 'project-2',
        local_repo_root: '/p2',
      })
      const repo = new TaskRepository(db)

      repo.create({ project_id: project1.id, title: 'P1 Task' })
      repo.create({ project_id: project2.id, title: 'P2 Task' })

      const p1Tasks = repo.findByProjectId(project1.id)
      expect(p1Tasks.length).toBe(1)
      expect(p1Tasks[0].title).toBe('P1 Task')
    })
  })

  describe('update', () => {
    it('updates writable fields', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)
      const task = repo.create({ project_id: project.id, title: 'Original' })

      const updated = repo.update(task.id, {
        title: 'Updated Title',
        goal: 'New goal',
        refer_link: 'https://example.com/tickets/42',
        branch_name: 'feature/xyz',
        workspace_name: 'alpha-ui',
        workspace_branch: 'feature/alpha-ui',
        workspace_subrepo_branches_json: JSON.stringify([{ repoPath: 'packages/ui', branch: 'feature/ui' }]),
        preferred_port: 4321,
        worktree_path: '/worktrees/xyz',
        port: 3000,
        dev_server_state: 'running',
        priority: 10,
        context_vault_root_path: '/repo/docs',
        context_vault_sources_json: JSON.stringify(['/repo/docs/auth']),
        context_vault_files_json: JSON.stringify([{ relativePath: 'guides/context.md' }]),
        context_vault_selected_file: 'guides/context.md',
      })

      expect(updated.id).toBe(task.id)
      expect(updated.title).toBe('Updated Title')
      expect(updated.goal).toBe('New goal')
      expect(updated.refer_link).toBe('https://example.com/tickets/42')
      expect(updated.branch_name).toBe('feature/xyz')
      expect(updated.workspace_name).toBe('alpha-ui')
      expect(updated.workspace_branch).toBe('feature/alpha-ui')
      expect(updated.workspace_subrepo_branches_json).toBe(
        JSON.stringify([{ repoPath: 'packages/ui', branch: 'feature/ui' }]),
      )
      expect(updated.preferred_port).toBe(4321)
      expect(updated.worktree_path).toBe('/worktrees/xyz')
      expect(updated.port).toBe(3000)
      expect(updated.dev_server_state).toBe('running')
      expect(updated.priority).toBe(10)
      expect(updated.context_vault_root_path).toBe('/repo/docs')
      expect(updated.context_vault_sources_json).toBe(JSON.stringify(['/repo/docs/auth']))
      expect(updated.context_vault_files_json).toBe(
        JSON.stringify([{ relativePath: 'guides/context.md' }]),
      )
      expect(updated.context_vault_selected_file).toBe('guides/context.md')
    })

    it('clears nullable fields when set to null', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)
      const task = repo.create({ project_id: project.id, title: 'Task', goal: 'Some goal' })

      const updated = repo.update(task.id, { latest_blocker: null })
      expect(updated.latest_blocker).toBeNull()
    })

    it('throws when updating non-existent task', () => {
      const repo = new TaskRepository(db)
      expect(() => repo.update('nonexistent', { title: 'X' })).toThrow()
    })
  })

  describe('delete', () => {
    it('deletes a task', () => {
      const project = createTestProject(db)
      const repo = new TaskRepository(db)
      const task = repo.create({ project_id: project.id, title: 'To Delete' })

      repo.delete(task.id)
      expect(repo.findById(task.id)).toBeNull()
    })
  })

  describe('foreign key enforcement', () => {
    it('throws when creating a task with non-existent project_id', () => {
      const repo = new TaskRepository(db)
      expect(() =>
        repo.create({ project_id: 'nonexistent-project', title: 'Orphan Task' })
      ).toThrow()
    })
  })
})
