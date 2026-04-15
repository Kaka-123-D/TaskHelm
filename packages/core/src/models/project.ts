import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { Project } from '../types.js'

export interface CreateProjectInput {
  readonly name: string
  readonly slug: string
  readonly local_repo_root: string
  readonly description?: string
  readonly default_branch?: string
  readonly branch_naming_pattern?: string
  readonly worktree_root?: string
  readonly dev_command?: string
  readonly install_command?: string
  readonly test_command?: string
  readonly max_active_dev_servers?: number
}

export interface UpdateProjectInput {
  readonly name?: string
  readonly description?: string
  readonly default_branch?: string
  readonly branch_naming_pattern?: string
  readonly worktree_root?: string
  readonly dev_command?: string
  readonly install_command?: string
  readonly test_command?: string
  readonly max_active_dev_servers?: number
}

type ProjectRow = {
  id: string
  slug: string
  name: string
  description: string | null
  local_repo_root: string
  default_branch: string | null
  branch_naming_pattern: string | null
  worktree_root: string | null
  dev_command: string | null
  install_command: string | null
  test_command: string | null
  max_active_dev_servers: number
  created_at: string
  updated_at: string
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    local_repo_root: row.local_repo_root,
    default_branch: row.default_branch,
    branch_naming_pattern: row.branch_naming_pattern,
    worktree_root: row.worktree_root,
    dev_command: row.dev_command,
    install_command: row.install_command,
    test_command: row.test_command,
    max_active_dev_servers: row.max_active_dev_servers,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export class ProjectRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateProjectInput): Project {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO projects (
          id, slug, name, description, local_repo_root,
          default_branch, branch_naming_pattern, worktree_root,
          dev_command, install_command, test_command,
          max_active_dev_servers,
          created_at, updated_at
        ) VALUES (
          @id, @slug, @name, @description, @local_repo_root,
          @default_branch, @branch_naming_pattern, @worktree_root,
          @dev_command, @install_command, @test_command,
          @max_active_dev_servers,
          @created_at, @updated_at
        )`
      )
      .run({
        id,
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        local_repo_root: input.local_repo_root,
        default_branch: input.default_branch ?? null,
        branch_naming_pattern: input.branch_naming_pattern ?? null,
        worktree_root: input.worktree_root ?? null,
        dev_command: input.dev_command ?? null,
        install_command: input.install_command ?? null,
        test_command: input.test_command ?? null,
        max_active_dev_servers: input.max_active_dev_servers ?? 1,
        created_at: now,
        updated_at: now,
      })

    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow
    return rowToProject(row)
  }

  findById(id: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
      | ProjectRow
      | undefined
    return row ? rowToProject(row) : null
  }

  findBySlug(slug: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as
      | ProjectRow
      | undefined
    return row ? rowToProject(row) : null
  }

  findAll(): readonly Project[] {
    const rows = this.db
      .prepare('SELECT * FROM projects ORDER BY created_at ASC')
      .all() as ProjectRow[]
    return rows.map(rowToProject)
  }

  update(id: string, input: UpdateProjectInput): Project {
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Project not found: ${id}`)
    }

    const now = new Date().toISOString()

    this.db
      .prepare(
        `UPDATE projects SET
          name = @name,
          description = @description,
          default_branch = @default_branch,
          branch_naming_pattern = @branch_naming_pattern,
          worktree_root = @worktree_root,
          dev_command = @dev_command,
          install_command = @install_command,
          test_command = @test_command,
          max_active_dev_servers = @max_active_dev_servers,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        default_branch:
          input.default_branch !== undefined ? input.default_branch : existing.default_branch,
        branch_naming_pattern:
          input.branch_naming_pattern !== undefined
            ? input.branch_naming_pattern
            : existing.branch_naming_pattern,
        worktree_root:
          input.worktree_root !== undefined ? input.worktree_root : existing.worktree_root,
        dev_command: input.dev_command !== undefined ? input.dev_command : existing.dev_command,
        install_command:
          input.install_command !== undefined ? input.install_command : existing.install_command,
        test_command:
          input.test_command !== undefined ? input.test_command : existing.test_command,
        max_active_dev_servers:
          input.max_active_dev_servers !== undefined
            ? input.max_active_dev_servers
            : existing.max_active_dev_servers,
        updated_at: now,
      })

    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow
    return rowToProject(row)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  }
}
