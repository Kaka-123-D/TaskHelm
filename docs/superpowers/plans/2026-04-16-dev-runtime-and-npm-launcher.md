# Dev Runtime And Npm Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `pnpm dev` database boot failures and finish the package split so `taskhelm` launches the local web app while `@taskhelm/cli` remains CLI-only.

**Architecture:** Keep the fix narrow. Make migration execution support a small non-transactional allowlist for schema rewrites that manage SQLite pragmas, harden DB initialization with explicit path validation, and split package runtime behavior by entrypoint rather than duplicating the CLI implementation.

**Tech Stack:** Node.js, pnpm workspaces, Commander, Next.js standalone runtime, better-sqlite3, Vitest.

---

### Task 1: Fix migration boot failure

**Files:**
- Modify: `packages/core/src/db/migrate.ts`
- Test: `packages/core/tests/db/migrate.test.ts`

- [ ] **Step 1: Add a failing migration regression test**

Add a test case that creates a pre-`013` schema snapshot with dependent foreign-key tables, runs `runMigrations(db)`, and expects `_migrations` to include `013_project_command_and_task_refer_link_cleanup.sql` plus the final `tasks` schema to contain `refer_link`.

- [ ] **Step 2: Run the targeted core migration test**

Run: `pnpm --dir packages/core exec vitest run tests/db/migrate.test.ts`
Expected: FAIL with a foreign key error or an assertion showing `013` is not applied.

- [ ] **Step 3: Implement non-transactional migration support**

Update `packages/core/src/db/migrate.ts` so:
- normal migrations still run inside `db.transaction(...)`
- a small `NON_TRANSACTIONAL_MIGRATIONS` allowlist contains `013_project_command_and_task_refer_link_cleanup.sql`
- allowlisted migrations run with plain `db.exec(sql)` and then record the migration row outside the transaction

- [ ] **Step 4: Re-run the targeted core migration test**

Run: `pnpm --dir packages/core exec vitest run tests/db/migrate.test.ts`
Expected: PASS

### Task 2: Harden DB initialization

**Files:**
- Modify: `packages/core/src/db/connection.ts`
- Test: `packages/core/tests/db/connection.test.ts`

- [ ] **Step 1: Add a failing DB path validation test**

Add a test that calls `createDatabase('')` and expects a clear application-level error mentioning `dbPath`.

- [ ] **Step 2: Run the targeted DB connection test**

Run: `pnpm --dir packages/core exec vitest run tests/db/connection.test.ts`
Expected: FAIL because empty-string validation does not exist yet.

- [ ] **Step 3: Implement minimal validation**

Update `createDatabase(dbPath)` so it throws `new Error('TaskHelm database path must be a non-empty string')` when `dbPath` is not a non-empty string before constructing `better-sqlite3`.

- [ ] **Step 4: Re-run the targeted DB connection test**

Run: `pnpm --dir packages/core exec vitest run tests/db/connection.test.ts`
Expected: PASS

### Task 3: Split launcher behavior between packages

**Files:**
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/launcher/runtime-manifest.ts`
- Test: `packages/cli/tests/launcher/entry.test.ts`
- Test: `packages/cli/tests/launcher/runtime-cache.test.ts`

- [ ] **Step 1: Add failing launcher behavior tests**

Update tests so:
- root launcher flow still app-launches on zero args through the root binary path
- CLI package zero-arg path prints help / parses commander instead of invoking `launchTaskHelmApp`
- manifest resolution falls back to a default URL template when env overrides are absent

- [ ] **Step 2: Run the targeted CLI launcher tests**

Run: `pnpm --dir packages/cli exec vitest run tests/launcher/entry.test.ts tests/launcher/runtime-cache.test.ts`
Expected: FAIL on the new zero-arg CLI expectation and missing default manifest URL.

- [ ] **Step 3: Implement the launcher split**

Make these changes:
- add an explicit option in CLI entry logic so app-launch only happens when invoked from the root `taskhelm` launcher path
- keep `packages/cli/bin/taskhelm.ts` CLI-only
- keep `bin/taskhelm.js` as the app-launching entry for the root package
- add a default runtime manifest URL template in `runtime-manifest.ts`, while preserving env override precedence

- [ ] **Step 4: Re-run the targeted CLI launcher tests**

Run: `pnpm --dir packages/cli exec vitest run tests/launcher/entry.test.ts tests/launcher/runtime-cache.test.ts`
Expected: PASS

### Task 4: Document manual publish flow and verify end-to-end builds

**Files:**
- Modify: `README.md`
- Modify: `docs/11-web-dashboard-spec.md`

- [ ] **Step 1: Update release docs**

Document:
- `taskhelm` = launcher package
- `@taskhelm/cli` = CLI package
- manual publish order for scoped packages first, then root package
- requirement to host runtime manifest and bundle at the configured default URL shape

- [ ] **Step 2: Run full verification**

Run:
- `pnpm --dir packages/core exec vitest run tests/db/migrate.test.ts tests/db/connection.test.ts`
- `pnpm --dir packages/cli exec vitest run tests/launcher/entry.test.ts tests/launcher/runtime-cache.test.ts`
- `pnpm run build`
- `pnpm run typecheck`

Expected:
- all targeted tests pass
- root build passes
- root typecheck passes
