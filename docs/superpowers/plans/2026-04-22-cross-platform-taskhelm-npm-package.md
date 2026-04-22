# Cross-Platform TaskHelm NPM Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `npm i -g taskhelm && taskhelm` work without a hosted runtime bundle by preparing the web runtime locally on first run.

**Architecture:** Replace the current bundled prebuilt runtime strategy with a versioned first-run runtime preparation flow. The launcher prepares a runtime from packaged local assets, caches it under `~/.taskhelm/runtime/<version>`, then boots the server from the cache. `@taskhelm/cli` remains CLI-only.

**Tech Stack:** Node.js, pnpm workspace scripts, Next.js standalone build, TypeScript, Vitest

---

### Task 1: Reframe launcher/runtime cache contract around local preparation

**Files:**
- Modify: `packages/cli/src/launcher/runtime-cache.ts`
- Modify: `packages/cli/src/launcher/index.ts`
- Modify: `packages/cli/tests/launcher/runtime-cache.test.ts`
- Modify: `packages/cli/tests/launcher/entry.test.ts`

- [ ] **Step 1: Write the failing tests for local prepare semantics**

Add coverage for:
- no bundled runtime candidate required
- cached runtime reuse still working
- first-run path calling a local prepare helper instead of remote manifest resolution

Run: `pnpm --dir packages/cli exec vitest run tests/launcher/runtime-cache.test.ts tests/launcher/entry.test.ts`
Expected: FAIL on missing local-prepare behavior

- [ ] **Step 2: Add a local runtime prepare abstraction**

Refactor `runtime-cache.ts` so `ensureRuntime(version)` prefers:
- existing valid cache
- local runtime preparation from installed package assets
- no remote manifest fallback in the default app-launch path

Keep explicit env overrides only if they are still useful for debugging, but they must not be required for normal installs.

- [ ] **Step 3: Wire launcher to the new contract**

Keep `launchTaskHelmApp()` responsible only for:
- resolving version
- ensuring runtime
- starting server
- opening browser

Run: `pnpm --dir packages/cli exec vitest run tests/launcher/runtime-cache.test.ts tests/launcher/entry.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/launcher/runtime-cache.ts packages/cli/src/launcher/index.ts packages/cli/tests/launcher/runtime-cache.test.ts packages/cli/tests/launcher/entry.test.ts
git commit -m "refactor: prepare taskhelm runtime locally on first run"
```

### Task 2: Add local runtime prepare script for installed packages

**Files:**
- Create: `scripts/prepare-installed-runtime.mjs`
- Modify: `package.json`
- Modify: `packages/web/scripts/package-runtime.mjs`
- Modify: `packages/web/package.json`

- [ ] **Step 1: Write the failing test or simulation hook assumptions**

Document and encode the expected contract:
- installed root package can invoke a local script that prepares runtime into a caller-provided cache directory
- script does not depend on `packages/web/runtime` being prebuilt beforehand

Use existing tarball/install simulation after implementation as the integration proof.

- [ ] **Step 2: Add an installed-package runtime prepare script**

Create a root script that:
- resolves the installed package root
- invokes the packaged web workspace build/runtime packaging flow
- copies or writes the prepared runtime into `~/.taskhelm/runtime/<version>` (or a provided target path)

The script must run against assets included in the installed npm tarball, not against the original monorepo workspace.

- [ ] **Step 3: Simplify web runtime packaging for local prepare**

Update `packages/web/scripts/package-runtime.mjs` so it can target an explicit output directory for the local cache prepare flow. It must still verify entrypoints and emit the minimal manifest needed by the launcher cache.

- [ ] **Step 4: Update root scripts**

Adjust root `build`/`prepack` so npm packing includes the assets needed for local prepare, but no longer treats `runtime/` as the primary release artifact.

Run: `pnpm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/prepare-installed-runtime.mjs package.json packages/web/scripts/package-runtime.mjs packages/web/package.json
git commit -m "build: add local runtime prepare flow for installed taskhelm"
```

### Task 3: Change root tarball contents from prebuilt runtime to buildable assets

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: any helper scripts that sync bundled runtime today, such as `scripts/sync-bundled-runtime.mjs`

- [ ] **Step 1: Write the failing packaging expectation**

Use tarball inspection to prove the desired output:
- tarball contains launcher + package-local build assets
- tarball does not rely on a prebuilt `runtime/standalone` directory as the shipped release contract

Run: `pnpm pack --pack-destination /tmp/taskhelm-pack-cross-platform`
Expected: current tarball still contains old bundled-runtime shape or misses required local-build assets

- [ ] **Step 2: Update published file list**

Change root packaging so the tarball includes only what the installed package needs to build locally. Remove the old bundled-runtime sync path if it is no longer part of the release contract.

- [ ] **Step 3: Update docs**

Revise `README.md` to say:
- `taskhelm` prepares the web runtime locally on first run
- no external runtime host is required
- `taskhelm-cli` is the separate CLI command

Run: `pnpm pack --pack-destination /tmp/taskhelm-pack-cross-platform`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore README.md scripts/sync-bundled-runtime.mjs
git commit -m "build: publish taskhelm as first-run local runtime package"
```

### Task 4: Prove install-and-run flow from a packed tarball

**Files:**
- Modify: `packages/cli/tests/launcher/runtime-cache.test.ts`
- Modify: `README.md`
- Create or modify helper notes/scripts under `/tmp` only during verification

- [ ] **Step 1: Run packaged install simulation**

Simulate:
- pack `@taskhelm/cli`
- pack root `taskhelm`
- extract/install both into a temp prefix
- run the root launcher resolution against the packed install layout

Expected: first run prepares runtime locally under cache and resolves a valid entrypoint

- [ ] **Step 2: Boot the prepared runtime**

Start the prepared runtime on a non-default port in the temp install simulation and verify:

```bash
curl -I http://127.0.0.1:<port>
```

Expected: `HTTP/1.1 200 OK`

- [ ] **Step 3: Run focused tests**

Run:
- `pnpm --dir packages/cli exec vitest run tests/launcher/runtime-cache.test.ts tests/launcher/entry.test.ts`
- `pnpm --dir packages/cli run typecheck`
- `pnpm --dir packages/web run build`
- `pnpm pack --pack-destination /tmp/taskhelm-pack-cross-platform`

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add packages/cli/tests/launcher/runtime-cache.test.ts README.md
git commit -m "test: verify cross-platform taskhelm install simulation"
```

### Task 5: Final review and release instructions

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-04-22-cross-platform-taskhelm-npm-package-design.md`
- Modify: `docs/superpowers/plans/2026-04-22-cross-platform-taskhelm-npm-package.md`

- [ ] **Step 1: Run final verification**

Run:
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm pack --pack-destination /tmp/taskhelm-pack-cross-platform-final`

Expected: PASS

- [ ] **Step 2: Update release instructions**

Make sure docs explain:
- publish order for internal packages
- `npm i -g taskhelm && taskhelm`
- `npm i -g @taskhelm/cli && taskhelm-cli`
- first-run local prepare behavior

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/2026-04-22-cross-platform-taskhelm-npm-package-design.md docs/superpowers/plans/2026-04-22-cross-platform-taskhelm-npm-package.md
git commit -m "docs: finalize cross-platform taskhelm packaging guidance"
```
