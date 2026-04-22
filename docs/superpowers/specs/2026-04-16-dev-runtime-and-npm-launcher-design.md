# Dev Runtime And Npm Launcher Design

## Goal

Stabilize local development boot so `pnpm dev` no longer crashes on database initialization, and finish the npm package split so:

- `npm i -g taskhelm && taskhelm` launches the local web app on port `4100`
- `npm i -g @taskhelm/cli` installs the CLI without auto-launching the web app

## Root Causes

### Local dev boot

`packages/core/src/db/migrate.ts` currently wraps every SQL migration in a transaction. Migration `013_project_command_and_task_refer_link_cleanup.sql` uses `PRAGMA foreign_keys = OFF` and rewrites `projects` and `tasks`. In SQLite, toggling `foreign_keys` inside a transaction is ineffective, so the migration still executes with foreign keys enabled and fails when `projects` is dropped and recreated while `tasks` still references it.

Separately, the web app boot path should fail clearly if the database path is invalid instead of surfacing a low-level `better-sqlite3` stack like `Cannot read properties of undefined (reading 'indexOf')`.

### Packaging and launcher split

The root `taskhelm` package is currently a thin launcher that delegates to `@taskhelm/cli`, but it does not yet provide a default runtime manifest URL for first-run downloads. `@taskhelm/cli` also still auto-launches the web app on zero args, which conflicts with the desired split between launcher package and CLI package.

## Desired Behavior

### `pnpm dev`

- Web and supervisor should both boot against the same local SQLite database without migration failures.
- Migration `013` must apply cleanly on existing databases.
- Database path validation should produce a clear application-level error if the path is invalid.

### Npm packages

- `taskhelm` is the app launcher package.
- `taskhelm` zero-arg execution downloads or reuses a prebuilt web runtime, starts the server on `4100`, waits for readiness, and opens the browser.
- `@taskhelm/cli` is CLI-only. Running it without a subcommand should show help, not launch the app.
- The launcher must have a default runtime manifest URL baked into code, with env overrides still supported for development and release testing.

## Design

### Migration execution

- Keep transactional execution as the default for normal migrations.
- Add an explicit non-transactional allowlist in `runMigrations()` for migrations that must manage SQLite pragmas outside a transaction.
- Start with `013_project_command_and_task_refer_link_cleanup.sql` in that allowlist.
- Keep the migration SQL file itself idempotent and focused on schema rewrite only.

### Database initialization hardening

- Validate `dbPath` in `createDatabase()` before constructing `better-sqlite3`.
- Throw a clear `Error` when `dbPath` is empty or non-string.
- Keep `packages/web/src/lib/db.ts` and `packages/supervisor/src/index.ts` behavior otherwise unchanged so the fix does not alter runtime semantics.

### Launcher/package split

- Root `taskhelm` package continues to expose the global `taskhelm` binary.
- `taskhelm` launcher path continues to live in `@taskhelm/cli`, but only the root package should trigger it by default.
- `@taskhelm/cli` zero-arg execution should print help text by calling the Commander program without invoking the launcher.
- Add a code-level default runtime manifest URL template in the launcher manifest resolver.
- Env overrides keep highest priority:
  - `TASKHELM_RUNTIME_BUNDLE_URL`
  - `TASKHELM_RUNTIME_MANIFEST_URL`
  - `TASKHELM_RUNTIME_BUNDLE_SHA256`
  - `TASKHELM_RUNTIME_ENTRYPOINTS`

## Release Model

- Publish `@taskhelm/core`, `@taskhelm/supervisor`, and `@taskhelm/cli` first.
- Publish `taskhelm` after the scoped packages are available.
- Host the runtime manifest and bundle artifacts at a stable URL that matches the default manifest template in code.
- The docs should explain that the launcher package depends on the hosted runtime bundle and that the CLI package is separate.

## Testing

- Regression test `runMigrations()` with a database that has pre-`013` schema and dependent tables, then verify `013` applies successfully.
- Regression test database path validation in `createDatabase()`.
- Launcher tests should cover:
  - root package launcher still zero-args into app mode
  - CLI package zero-arg does not app-launch
  - manifest resolver uses the default URL when env overrides are absent

## Non-Goals

- No redesign of runtime download storage layout.
- No change to the hosted artifact format beyond what the launcher already expects.
- No publish automation or CI release pipeline in this patch; only code and documentation needed for manual publishing.
