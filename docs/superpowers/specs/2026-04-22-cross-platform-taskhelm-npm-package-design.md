# Cross-Platform TaskHelm NPM Package Design

## Goal

Make `taskhelm` installable as a single global npm package that works across supported operating systems and CPU architectures:

```bash
npm i -g taskhelm
taskhelm
```

The command should start the local web app on `127.0.0.1:4100` without requiring any separately hosted runtime bundle.

`@taskhelm/cli` remains a separate CLI-only package installed as:

```bash
npm i -g @taskhelm/cli
taskhelm-cli
```

## Current Problem

The current `feat/bundled-npm-runtime` branch bundles a prebuilt Next standalone runtime inside the root `taskhelm` tarball. That runtime is produced on the maintainer's machine, so it contains platform-specific native dependencies such as Sharp/libvips for the build host. A tarball built on macOS ARM cannot honestly claim to work on Linux, Windows, or a different CPU architecture.

The current branch is therefore valid only for the same platform class as the build machine.

## Approaches Considered

### 1. Keep bundled prebuilt runtime per release

Publish one `taskhelm` tarball that already contains the built web runtime.

Pros:
- Fast first run
- Simple launcher logic

Cons:
- Not cross-platform
- Every release artifact is tied to the maintainer's build machine

### 2. Publish separate per-platform packages

Publish platform-specific variants such as `taskhelm-darwin-arm64`, `taskhelm-linux-x64`, and so on.

Pros:
- Keeps fast startup
- Clear runtime ownership per platform

Cons:
- More release complexity
- Awkward UX compared with the desired single `taskhelm` package

### 3. Ship a universal launcher and prepare runtime on first run

Publish a single `taskhelm` npm package that contains the launcher plus the web workspace and scripts needed to prepare a runtime locally on the user's machine. On first run, TaskHelm builds or prepares the runtime on that machine, caches it under `~/.taskhelm/runtime/<version>`, then starts the app from the prepared runtime.

Pros:
- Single package name
- Cross-platform by construction
- No external runtime host/CDN required

Cons:
- First run is slower
- Launcher must manage runtime preparation and caching

## Chosen Design

Use approach 3: a universal launcher with first-run local runtime preparation.

The root `taskhelm` package will no longer publish a prebuilt `runtime/` directory. Instead, it will publish:

- the root launcher bin
- `README.md`
- the `packages/web` workspace needed to build the local runtime
- lightweight build helper scripts

On first run, the launcher will:

1. Detect whether a cached runtime already exists for the current package version.
2. If no cached runtime exists, prepare one locally by invoking the packaged web runtime build flow from inside the installed npm package.
3. Cache the prepared runtime under `~/.taskhelm/runtime/<version>`.
4. Start the server from the cached runtime on `127.0.0.1:4100`.
5. Open the browser.

Subsequent runs reuse the cached runtime unless the package version changes.

## Runtime Preparation Flow

### Installed package contents

The root package must include enough source/build assets to create a runtime locally:

- `bin/taskhelm.js`
- root `package.json`
- `README.md`
- `packages/web/**` needed for runtime build
- shared build helpers used by `packages/web`

The package must not include a machine-specific prebuilt runtime directory.

### First-run prepare

When `taskhelm` runs:

1. Resolve the current package version from the installed root package.
2. Check `~/.taskhelm/runtime/<version>/manifest.json` and runtime entrypoint candidates.
3. If the runtime is missing:
   - run a local preparation command from the installed package
   - the preparation command builds `packages/web`
   - the preparation command packages the runtime into the cache directory for the current version
4. Start the runtime from the cached entrypoint.

The preparation command must be local-only. It must not fetch an externally hosted runtime bundle.

## Caching Semantics

- Cache location remains `~/.taskhelm/runtime/<version>`
- Cache is version-scoped
- If cache exists and entrypoint is valid, launcher skips the prepare step
- If cache is missing or incomplete, launcher rebuilds it locally
- Launcher error messages must tell the user whether the failure happened during:
  - runtime preparation
  - runtime startup
  - browser open

## Package Boundaries

### `taskhelm`

- App launcher package
- Zero-arg default behavior: prepare runtime if needed, then launch web app
- No dependency on externally hosted runtime manifests

### `@taskhelm/cli`

- CLI-only package
- Command name remains `taskhelm-cli`
- Must not auto-launch the web app

## Release Flow

Publishing no longer requires a runtime CDN.

Maintainer release steps:

1. Build and test workspace packages
2. Publish internal packages in dependency order:
   - `@taskhelm/core`
   - `@taskhelm/supervisor`
   - `@taskhelm/cli`
   - `taskhelm`
3. Users install `taskhelm` globally and the launcher handles first-run prepare locally

## Error Handling

### First-run build failure

If local runtime preparation fails, the launcher must fail with a clear message that includes:

- the package version being prepared
- the step that failed
- the local command that failed, if available

### Cache corruption

If the cache directory exists but has no valid entrypoint, the launcher must delete or replace the broken cache and rebuild it locally.

### Unsupported environment

If the installed environment cannot prepare the runtime locally, the launcher must fail clearly rather than falling back to any remote-host assumption.

## Testing Strategy

Tests must cover:

- root package no longer depending on external runtime manifest defaults
- runtime cache prepare path on first run
- runtime cache reuse path on second run
- `@taskhelm/cli` remaining CLI-only
- root tarball including the required source/build assets and excluding prebuilt runtime artifacts
- packed install simulation proving that the launcher resolves package-local assets correctly

## Non-Goals

- Reworking the web app runtime architecture beyond what is necessary for first-run local preparation
- Reintroducing CDN-hosted runtime bundles
- Combining `taskhelm` and `@taskhelm/cli` back into one command name
