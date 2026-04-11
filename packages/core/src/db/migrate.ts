import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type Database from 'better-sqlite3'

function getMigrationsDir(): string {
  // Works at runtime from both src/ (vitest) and dist/ (production) because
  // import.meta.url always points to the actual file being executed.
  const thisFile = fileURLToPath(import.meta.url)
  const thisDir = dirname(thisFile)

  // When running from dist/db/migrate.js, walk up two levels to the package root,
  // then into src/db/migrations.  When running directly from src/ (vitest), the
  // relative path is just ./migrations.
  const candidateSrc = join(thisDir, 'migrations')
  const candidateDist = join(thisDir, '..', '..', 'src', 'db', 'migrations')

  try {
    readdirSync(candidateSrc)
    return candidateSrc
  } catch {
    return candidateDist
  }
}

export function runMigrations(db: Database.Database): void {
  // Ensure tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const migrationsDir = getMigrationsDir()

  const allFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set<string>(
    (db.prepare('SELECT filename FROM _migrations').all() as Array<{ filename: string }>)
      .map((r) => r.filename)
  )

  const insertMigration = db.prepare(
    'INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)'
  )

  for (const filename of allFiles) {
    if (applied.has(filename)) {
      continue
    }

    const sql = readFileSync(join(migrationsDir, filename), 'utf-8')

    db.transaction(() => {
      db.exec(sql)
      insertMigration.run(filename, new Date().toISOString())
    })()
  }
}
