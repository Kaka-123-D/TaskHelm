# TaskHelm NPM Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package TaskHelm as a lightweight npm install that launches the local web app on port `4100` from the `taskhelm` binary while preserving CLI subcommands.

**Architecture:** Publish a thin Node launcher package and keep the web runtime as a versioned standalone artifact downloaded on first launch. The launcher will dispatch CLI subcommands directly, but when invoked without subcommands it will ensure the runtime bundle is cached locally, start it on `4100`, and open the browser.

**Tech Stack:** Node.js, TypeScript, Commander, Next.js standalone output, child_process, local filesystem cache, HTTP artifact download

---

### Task 1: Make The Root Package Publishable

**Files:**
- Modify: `package.json`
- Modify: `packages/cli/package.json`
- Create: `bin/taskhelm.js`
- Test: `packages/cli/tests/commands/project.test.ts`

- [ ] **Step 1: Define the published package surface**

Set the root `package.json` up to be publishable as `taskhelm` and wire `bin` to the launcher entrypoint.

Key changes:

```json
{
  "name": "taskhelm",
  "version": "0.1.0",
  "private": false,
  "bin": {
    "taskhelm": "./bin/taskhelm.js"
  }
}
```

- [ ] **Step 2: Create the launcher shim**

Create `bin/taskhelm.js` as a tiny executable that imports the compiled launcher runtime.

```js
#!/usr/bin/env node
import('../dist/launcher/index.js')
```

- [ ] **Step 3: Verify existing CLI tests still pass**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/project.test.ts tests/commands/task.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json packages/cli/package.json bin/taskhelm.js
git commit -m "build: prepare root package for npm publishing"
```

### Task 2: Add Zero-Arg Launcher Routing

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/launcher/index.ts`
- Create: `packages/cli/src/launcher/argv.ts`
- Test: `packages/cli/tests/commands/agent.test.ts`

- [ ] **Step 1: Write a failing test for zero-arg launcher routing**

Add a CLI-level test that asserts `taskhelm` with no subcommand routes into launcher mode, while `taskhelm project list` still routes into Commander commands.

- [ ] **Step 2: Run the test to confirm failure**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/agent.test.ts`

Expected: FAIL because no launcher dispatch exists yet

- [ ] **Step 3: Add launcher dispatch**

Implement a top-level branch:

```ts
const argv = process.argv.slice(2)
if (argv.length === 0) {
  await launchTaskHelmApp()
} else {
  await program.parseAsync(process.argv)
}
```

- [ ] **Step 4: Re-run the test**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/agent.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/launcher/index.ts packages/cli/src/launcher/argv.ts packages/cli/tests/commands/agent.test.ts
git commit -m "feat: route zero-arg taskhelm to launcher mode"
```

### Task 3: Build A Runtime Cache And Download Layer

**Files:**
- Create: `packages/cli/src/launcher/runtime-cache.ts`
- Create: `packages/cli/src/launcher/runtime-download.ts`
- Create: `packages/cli/src/launcher/runtime-manifest.ts`
- Test: `packages/cli/tests/commands/workspace.test.ts`

- [ ] **Step 1: Write failing tests for cache resolution and invalid cache recovery**

Cover:
- versioned runtime path resolution
- missing entrypoint detection
- corrupted version folder triggering refresh

- [ ] **Step 2: Run tests to confirm failure**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/workspace.test.ts`

Expected: FAIL because runtime cache/download helpers do not exist

- [ ] **Step 3: Implement cache helpers**

Core functions:

```ts
export function getRuntimeRoot(version: string): string
export function getRuntimeEntrypoint(version: string): string
export function isRuntimeReady(version: string): boolean
export async function ensureRuntime(version: string): Promise<string>
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/workspace.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/launcher/runtime-cache.ts packages/cli/src/launcher/runtime-download.ts packages/cli/src/launcher/runtime-manifest.ts packages/cli/tests/commands/workspace.test.ts
git commit -m "feat: add cached runtime download layer"
```

### Task 4: Produce Standalone Web Runtime Output

**Files:**
- Modify: `packages/web/next.config.ts`
- Create: `packages/web/scripts/package-runtime.mjs`
- Test: `packages/web/package.json`

- [ ] **Step 1: Configure standalone output**

Update `packages/web/next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@taskhelm/core'],
  serverExternalPackages: ['better-sqlite3'],
}
```

- [ ] **Step 2: Add runtime packaging script**

Create a script that collects:
- `.next/standalone`
- `.next/static`
- `public` if present
- a small runtime manifest

- [ ] **Step 3: Verify web build still passes**

Run: `pnpm run build`

Expected: PASS with standalone output available

- [ ] **Step 4: Commit**

```bash
git add packages/web/next.config.ts packages/web/scripts/package-runtime.mjs
git commit -m "build: emit standalone web runtime bundle"
```

### Task 5: Launch The Local Web Runtime On Port 4100

**Files:**
- Create: `packages/cli/src/launcher/server-process.ts`
- Create: `packages/cli/src/launcher/open-browser.ts`
- Modify: `packages/cli/src/launcher/index.ts`
- Test: `packages/cli/tests/commands/dev.test.ts`

- [ ] **Step 1: Write failing tests for process spawn and health wait**

Cover:
- runtime child process spawned with `PORT=4100`
- health-check wait before browser open
- clear error when `4100` is occupied

- [ ] **Step 2: Run the tests to confirm failure**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/dev.test.ts`

Expected: FAIL because launcher start flow is not implemented

- [ ] **Step 3: Implement server launch flow**

Core behavior:

```ts
const child = spawn(process.execPath, [entrypoint], {
  env: {
    ...process.env,
    PORT: '4100',
    HOSTNAME: '127.0.0.1',
  },
  stdio: 'inherit',
})
```

Wait for local health success, then open:

```ts
http://127.0.0.1:4100
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm --dir packages/cli exec vitest run tests/commands/dev.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/launcher/server-process.ts packages/cli/src/launcher/open-browser.ts packages/cli/src/launcher/index.ts packages/cli/tests/commands/dev.test.ts
git commit -m "feat: launch local taskhelm web runtime"
```

### Task 6: Add Lightweight Distribution Plumbing

**Files:**
- Modify: `package.json`
- Modify: `packages/cli/package.json`
- Create: `scripts/release-runtime.mjs`
- Modify: `README.md`

- [ ] **Step 1: Add release/build scripts**

Wire scripts for:
- build launcher
- build standalone web runtime
- package runtime artifact
- publish package

- [ ] **Step 2: Document install and launch UX**

Update README to clearly distinguish:
- `npm i -g taskhelm`
- `taskhelm`
- first-run download behavior
- runtime cache location

- [ ] **Step 3: Verify root build and typecheck**

Run:

```bash
pnpm run typecheck
pnpm run build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json packages/cli/package.json scripts/release-runtime.mjs README.md
git commit -m "docs: wire npm distribution workflow"
```

### Task 7: Final Verification

**Files:**
- Modify: none expected

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --dir packages/cli exec vitest run tests/commands/project.test.ts tests/commands/task.test.ts tests/commands/workspace.test.ts tests/commands/dev.test.ts tests/commands/agent.test.ts
```

Expected: PASS

- [ ] **Step 2: Run repo-wide verification**

Run:

```bash
pnpm run typecheck
pnpm run build
```

Expected: PASS

- [ ] **Step 3: Check affected scope**

Run GitNexus detect-changes on the full worktree and verify the affected symbols are limited to launcher, web packaging, docs, and root packaging files.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: package taskhelm as lightweight npm launcher"
```

