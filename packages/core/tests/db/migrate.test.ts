import { describe, it, expect, afterEach } from 'vitest'
import { unlinkSync, existsSync } from 'node:fs'
import { createDatabase } from '../../src/db/connection'
import { runMigrations } from '../../src/db/migrate'

const TEST_DB_PATH = '/tmp/taskhelm-test-migrate.db'

afterEach(() => {
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }
})

describe('createDatabase', () => {
  it('creates a database with WAL journal mode', () => {
    const db = createDatabase(TEST_DB_PATH)
    const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }
    expect(row.journal_mode).toBe('wal')
    db.close()
  })

  it('enables foreign keys', () => {
    const db = createDatabase(TEST_DB_PATH)
    const row = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }
    expect(row.foreign_keys).toBe(1)
    db.close()
  })
})

describe('runMigrations', () => {
  it('creates the _migrations tracking table', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    ).get()
    expect(row).toBeTruthy()
    db.close()
  })

  it('creates all 8 domain tables', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const expectedTables = [
      'projects',
      'tasks',
      'agent_runs',
      'review_gates',
      'dev_servers',
      'notifications',
      'locks',
      'events',
    ]

    for (const table of expectedTables) {
      const row = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      ).get()
      expect(row, `expected table "${table}" to exist`).toBeTruthy()
    }

    db.close()
  })

  it('records applied migrations in _migrations table', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const rows = db.prepare('SELECT filename FROM _migrations ORDER BY filename').all() as Array<{ filename: string }>
    expect(rows.length).toBe(13)
    expect(rows[0].filename).toMatch(/001_projects/)
    expect(rows[8].filename).toMatch(/009_/)
    expect(rows[9].filename).toMatch(/010_local_context_schema_cleanup/)
    expect(rows[10].filename).toMatch(/011_task_runtime_preferences/)
    expect(rows[11].filename).toMatch(/012_remove_task_status_and_phase/)
    expect(rows[12].filename).toMatch(/013_project_command_and_task_refer_link_cleanup/)
    db.close()
  })

  it('removes legacy project/task fields while keeping local context vault fields', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const projectColumns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>
    const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>

    expect(projectColumns.map((column) => column.name)).toEqual([
      'id',
      'slug',
      'name',
      'description',
      'local_repo_root',
      'default_branch',
      'branch_naming_pattern',
      'worktree_root',
      'dev_command',
      'install_command',
      'max_active_dev_servers',
      'created_at',
      'updated_at',
    ])

    expect(taskColumns.map((column) => column.name)).toEqual([
      'id',
      'project_id',
      'key',
      'title',
      'goal',
      'refer_link',
      'priority',
      'branch_name',
      'worktree_path',
      'port',
      'dev_server_state',
      'context_vault_root_path',
      'context_vault_sources_json',
      'context_vault_files_json',
      'context_vault_selected_file',
      'current_agent_run_id',
      'latest_blocker',
      'created_at',
      'updated_at',
      'workspace_name',
      'workspace_branch',
      'workspace_subrepo_branches_json',
      'preferred_port',
    ])
    db.close()
  })

  it('is idempotent — running twice does not throw', () => {
    const db = createDatabase(TEST_DB_PATH)
    expect(() => {
      runMigrations(db)
      runMigrations(db)
    }).not.toThrow()
    db.close()
  })

  it('skips already-applied migrations on second run', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)
    const countBefore = (db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number }).n

    runMigrations(db)
    const countAfter = (db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number }).n

    expect(countAfter).toBe(countBefore)
    db.close()
  })
})
