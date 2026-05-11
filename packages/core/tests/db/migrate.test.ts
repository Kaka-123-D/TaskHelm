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

  it('creates the expected domain tables and drops removed ones', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const expectedTables = ['projects', 'tasks', 'dev_servers', 'notifications', 'locks', 'events']
    for (const table of expectedTables) {
      const row = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      ).get()
      expect(row, `expected table "${table}" to exist`).toBeTruthy()
    }

    const removedTables = ['agent_runs', 'review_gates']
    for (const table of removedTables) {
      const row = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      ).get()
      expect(row, `expected table "${table}" to be dropped`).toBeFalsy()
    }

    db.close()
  })

  it('records applied migrations in _migrations table', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const rows = db.prepare('SELECT filename FROM _migrations ORDER BY filename').all() as Array<{ filename: string }>
    expect(rows.length).toBe(18)
    expect(rows[0].filename).toMatch(/001_projects/)
    expect(rows[8].filename).toMatch(/009_/)
    expect(rows[9].filename).toMatch(/010_local_context_schema_cleanup/)
    expect(rows[10].filename).toMatch(/011_task_runtime_preferences/)
    expect(rows[11].filename).toMatch(/012_remove_task_status_and_phase/)
    expect(rows[12].filename).toMatch(/013_project_command_and_task_refer_link_cleanup/)
    expect(rows[13].filename).toMatch(/014_drop_agent_runs_and_review_gates/)
    expect(rows[14].filename).toMatch(/015_dev_server_logs_and_errors/)
    expect(rows[15].filename).toMatch(/016_task_subrepos/)
    expect(rows[16].filename).toMatch(/017_task_subrepos_attached_flag/)
    expect(rows[17].filename).toMatch(/018_projects_is_multi_repo/)
    db.close()
  })

  it('adds is_multi_repo column to projects (migration 018), default 0', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const columns = db.prepare('PRAGMA table_info(projects)').all() as Array<{
      name: string
      dflt_value: string | null
      notnull: number
    }>
    const flag = columns.find(c => c.name === 'is_multi_repo')
    expect(flag).toBeTruthy()
    expect(flag?.notnull).toBe(1)
    expect(flag?.dflt_value).toBe('0')
    db.close()
  })

  it('creates task_subrepos table and adds task_subrepo_id to dev_servers (migration 016) plus created_by_taskhelm column (017)', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const taskSubreposTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='task_subrepos'"
    ).get()
    expect(taskSubreposTable).toBeTruthy()

    const subrepoColumns = db.prepare('PRAGMA table_info(task_subrepos)').all() as Array<{ name: string }>
    expect(subrepoColumns.map(column => column.name)).toEqual([
      'id',
      'task_id',
      'repo_path',
      'branch_name',
      'worktree_path',
      'preferred_port',
      'dev_command',
      'dev_server_state',
      'created_at',
      'updated_at',
      'created_by_taskhelm',
    ])

    const devServerColumns = db.prepare('PRAGMA table_info(dev_servers)').all() as Array<{ name: string }>
    expect(devServerColumns.map(column => column.name)).toContain('task_subrepo_id')

    db.close()
  })

  it('adds log_path and error_message columns to dev_servers (migration 015)', () => {
    const db = createDatabase(TEST_DB_PATH)
    runMigrations(db)

    const columns = db.prepare('PRAGMA table_info(dev_servers)').all() as Array<{ name: string }>
    const names = columns.map(column => column.name)
    expect(names).toContain('log_path')
    expect(names).toContain('error_message')

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
      'is_multi_repo',
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

  it('applies migration 013 on an existing pre-cleanup database with dependent foreign keys', () => {
    const db = createDatabase(TEST_DB_PATH)

    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        local_repo_root TEXT NOT NULL,
        default_branch TEXT,
        branch_naming_pattern TEXT,
        worktree_root TEXT,
        dev_command TEXT,
        install_command TEXT,
        test_command TEXT,
        max_active_dev_servers INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        key TEXT,
        title TEXT NOT NULL,
        goal TEXT,
        source_type TEXT,
        source_ref TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        branch_name TEXT,
        worktree_path TEXT,
        port INTEGER,
        dev_server_state TEXT,
        context_vault_root_path TEXT,
        context_vault_sources_json TEXT,
        context_vault_files_json TEXT,
        context_vault_selected_file TEXT,
        current_agent_run_id TEXT,
        latest_blocker TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        workspace_name TEXT,
        workspace_branch TEXT,
        workspace_subrepo_branches_json TEXT,
        preferred_port INTEGER
      );

      CREATE TABLE agent_runs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        kind TEXT NOT NULL,
        role TEXT,
        status TEXT NOT NULL,
        input_ref TEXT,
        output_ref TEXT,
        error_message TEXT,
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE review_gates (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        gate_type TEXT NOT NULL,
        status TEXT NOT NULL,
        result TEXT,
        notes_ref TEXT,
        opened_at TEXT,
        closed_at TEXT,
        UNIQUE(task_id, gate_type)
      );

      CREATE TABLE dev_servers (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        task_id TEXT,
        port INTEGER NOT NULL UNIQUE,
        pid INTEGER,
        status TEXT NOT NULL,
        health_url TEXT,
        started_at TEXT,
        stopped_at TEXT
      );

      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        project_id TEXT,
        level TEXT NOT NULL,
        channel TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        delivered_at TEXT
      );

      CREATE TABLE locks (
        key TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `)

    db.prepare(
      `INSERT INTO projects (
        id, slug, name, description, local_repo_root, default_branch, branch_naming_pattern, worktree_root,
        dev_command, install_command, test_command, max_active_dev_servers, created_at, updated_at
      ) VALUES (
        'project-1', 'demo', 'Demo', NULL, '/tmp/repo', 'main', NULL, NULL,
        'npm run dev', 'npm install', 'npm test', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
      )`
    ).run()

    db.prepare(
      `INSERT INTO tasks (
        id, project_id, key, title, goal, source_type, source_ref, priority, branch_name, worktree_path, port,
        dev_server_state, context_vault_root_path, context_vault_sources_json, context_vault_files_json,
        context_vault_selected_file, current_agent_run_id, latest_blocker, created_at, updated_at,
        workspace_name, workspace_branch, workspace_subrepo_branches_json, preferred_port
      ) VALUES (
        'task-1', 'project-1', 'TASK-1', 'Demo task', NULL, 'ticket', '#1', 3, NULL, NULL, NULL,
        NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z',
        NULL, NULL, NULL, NULL
      )`
    ).run()

    db.prepare(
      `INSERT INTO agent_runs (
        id, task_id, kind, role, status, input_ref, output_ref, error_message, started_at, finished_at, created_at
      ) VALUES (
        'run-1', 'task-1', 'implement', 'worker', 'queued', NULL, NULL, NULL, NULL, NULL, '2026-01-01T00:00:00.000Z'
      )`
    ).run()

    db.prepare(
      `INSERT INTO _migrations (filename, applied_at) VALUES
        ('001_projects.sql', '2026-01-01T00:00:00.000Z'),
        ('002_tasks.sql', '2026-01-01T00:00:00.000Z'),
        ('003_agent_runs.sql', '2026-01-01T00:00:00.000Z'),
        ('004_review_gates.sql', '2026-01-01T00:00:00.000Z'),
        ('005_dev_servers.sql', '2026-01-01T00:00:00.000Z'),
        ('006_notifications.sql', '2026-01-01T00:00:00.000Z'),
        ('007_locks.sql', '2026-01-01T00:00:00.000Z'),
        ('008_events.sql', '2026-01-01T00:00:00.000Z'),
        ('009_specdown_context_vault.sql', '2026-01-01T00:00:00.000Z'),
        ('010_local_context_schema_cleanup.sql', '2026-01-01T00:00:00.000Z'),
        ('011_task_runtime_preferences.sql', '2026-01-01T00:00:00.000Z'),
        ('012_remove_task_status_and_phase.sql', '2026-01-01T00:00:00.000Z')`
    ).run()

    expect(() => runMigrations(db)).not.toThrow()

    const taskColumns = db.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>
    expect(taskColumns.map(column => column.name)).toContain('refer_link')
    expect(taskColumns.map(column => column.name)).not.toContain('source_type')

    const rows = db.prepare('SELECT filename FROM _migrations ORDER BY filename').all() as Array<{ filename: string }>
    expect(rows.at(-1)?.filename).toBe('018_projects_is_multi_repo.sql')
    db.close()
  })
})
