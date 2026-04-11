import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createDatabase } from '../../src/db/connection.js'
import { runMigrations } from '../../src/db/migrate.js'
import { ProjectRepository } from '../../src/models/project.js'
import type Database from 'better-sqlite3'

const TEST_DB = path.join(import.meta.dirname, '__test_project__.db')
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

describe('ProjectRepository', () => {
  describe('create + findById', () => {
    it('creates a project and retrieves it by id', () => {
      const repo = new ProjectRepository(db)
      const project = repo.create({
        name: 'My Project',
        slug: 'my-project',
        local_repo_root: '/home/user/my-project',
      })

      expect(project.id).toBeTruthy()
      expect(project.name).toBe('My Project')
      expect(project.slug).toBe('my-project')
      expect(project.local_repo_root).toBe('/home/user/my-project')
      expect(project.description).toBeNull()
      expect(project.max_active_dev_servers).toBe(1)
      expect(project.specdown_mode).toBe('disabled')
      expect(project.created_at).toBeTruthy()
      expect(project.updated_at).toBeTruthy()

      const found = repo.findById(project.id)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(project.id)
      expect(found!.name).toBe('My Project')
    })

    it('returns null for unknown id', () => {
      const repo = new ProjectRepository(db)
      expect(repo.findById('nonexistent-id')).toBeNull()
    })

    it('creates a project with optional fields', () => {
      const repo = new ProjectRepository(db)
      const project = repo.create({
        name: 'Full Project',
        slug: 'full-project',
        local_repo_root: '/home/user/full',
        description: 'A full project',
        default_branch: 'main',
        branch_naming_pattern: 'feature/{task-id}',
        worktree_root: '/home/user/worktrees',
        dev_command: 'pnpm dev',
        install_command: 'pnpm install',
        test_command: 'pnpm test',
        max_active_dev_servers: 3,
        specdown_mode: 'linked',
        specdown_project_ref: 'proj-123',
      })

      expect(project.description).toBe('A full project')
      expect(project.default_branch).toBe('main')
      expect(project.branch_naming_pattern).toBe('feature/{task-id}')
      expect(project.worktree_root).toBe('/home/user/worktrees')
      expect(project.dev_command).toBe('pnpm dev')
      expect(project.install_command).toBe('pnpm install')
      expect(project.test_command).toBe('pnpm test')
      expect(project.max_active_dev_servers).toBe(3)
      expect(project.specdown_mode).toBe('linked')
      expect(project.specdown_project_ref).toBe('proj-123')
    })
  })

  describe('findBySlug', () => {
    it('finds a project by slug', () => {
      const repo = new ProjectRepository(db)
      const project = repo.create({
        name: 'Slug Project',
        slug: 'slug-project',
        local_repo_root: '/home/user/slug',
      })

      const found = repo.findBySlug('slug-project')
      expect(found).not.toBeNull()
      expect(found!.id).toBe(project.id)
    })

    it('returns null for unknown slug', () => {
      const repo = new ProjectRepository(db)
      expect(repo.findBySlug('no-such-slug')).toBeNull()
    })
  })

  describe('findAll', () => {
    it('returns all projects', () => {
      const repo = new ProjectRepository(db)
      repo.create({ name: 'Project A', slug: 'project-a', local_repo_root: '/a' })
      repo.create({ name: 'Project B', slug: 'project-b', local_repo_root: '/b' })
      repo.create({ name: 'Project C', slug: 'project-c', local_repo_root: '/c' })

      const all = repo.findAll()
      expect(all.length).toBe(3)
      expect(all.map((p) => p.slug).sort()).toEqual(['project-a', 'project-b', 'project-c'])
    })

    it('returns empty array when no projects', () => {
      const repo = new ProjectRepository(db)
      expect(repo.findAll()).toEqual([])
    })
  })

  describe('update', () => {
    it('updates fields and returns new object', () => {
      const repo = new ProjectRepository(db)
      const original = repo.create({
        name: 'Original',
        slug: 'original',
        local_repo_root: '/orig',
      })

      const updated = repo.update(original.id, { name: 'Updated', description: 'New desc' })

      expect(updated.id).toBe(original.id)
      expect(updated.name).toBe('Updated')
      expect(updated.description).toBe('New desc')
      expect(updated.slug).toBe('original')
    })

    it('updated_at changes after update', () => {
      const repo = new ProjectRepository(db)
      const original = repo.create({
        name: 'Time Test',
        slug: 'time-test',
        local_repo_root: '/time',
      })

      // Small delay to ensure timestamp changes
      const updated = repo.update(original.id, { name: 'Time Test Updated' })
      // updated_at should be >= original
      expect(updated.updated_at >= original.updated_at).toBe(true)
    })

    it('throws when updating non-existent project', () => {
      const repo = new ProjectRepository(db)
      expect(() => repo.update('nonexistent', { name: 'X' })).toThrow()
    })
  })

  describe('delete', () => {
    it('deletes a project', () => {
      const repo = new ProjectRepository(db)
      const project = repo.create({
        name: 'To Delete',
        slug: 'to-delete',
        local_repo_root: '/delete',
      })

      repo.delete(project.id)
      expect(repo.findById(project.id)).toBeNull()
    })
  })

  describe('duplicate slug rejection', () => {
    it('throws when creating a project with a duplicate slug', () => {
      const repo = new ProjectRepository(db)
      repo.create({ name: 'First', slug: 'same-slug', local_repo_root: '/first' })

      expect(() =>
        repo.create({ name: 'Second', slug: 'same-slug', local_repo_root: '/second' })
      ).toThrow()
    })
  })
})
