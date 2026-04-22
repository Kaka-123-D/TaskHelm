# TaskHelm NPM Packaging Design

## Goal

Allow users to install TaskHelm from npm and run it with minimal friction while keeping the published package lightweight.

Target UX:

- global install: `npm i -g taskhelm`
- launch: `taskhelm`
- default behavior:
  - ensure the local web runtime is available
  - start the web app on port `4100`
  - open the browser automatically
- CLI subcommands remain available through the same `taskhelm` binary

## Non-Goals

- Shipping the entire monorepo as one npm tarball
- Requiring users to run `pnpm`, `turbo`, or a monorepo build after install
- Embedding a full development Next.js environment in the package
- Replacing the current workspace/runtime/task model
- Solving update distribution for every possible offline environment in phase 1

## Constraints

- The package should stay lightweight enough that install size and cold-start remain reasonable
- The runtime must work on typical desktop developer machines without extra manual setup
- The packaged app must still use the existing SQLite/local-first architecture
- `taskhelm` should continue to support CLI commands, not just the web launcher
- The launcher should not depend on repository-relative paths after installation

## Packaging Options Considered

### Option 1: Publish Monolith

Publish CLI + core + supervisor + full web runtime directly inside the npm package.

Pros:

- simplest mental model
- no first-run download
- deterministic offline behavior after install

Cons:

- package will be heavy
- slow installs and slow publish pipeline
- duplicates web build artifacts into npm tarball

### Option 2: Thin Launcher + First-Run Runtime Download

Publish a small npm package containing:

- the `taskhelm` launcher
- CLI runtime
- minimal orchestration code

On first launch, the launcher downloads a prebuilt web runtime bundle for the current TaskHelm version, stores it under the user data dir, then starts it locally.

Pros:

- lightweight npm install
- clean UX after the first run
- decouples release of npm launcher and web artifact format from repo layout

Cons:

- first run needs network
- requires a runtime artifact host/version manifest
- needs cache/update logic

### Option 3: Thin Launcher + On-Device Build

Publish source code and have `taskhelm` build the web runtime locally on first run.

Pros:

- smaller than monolith
- no artifact CDN required

Cons:

- too slow
- too fragile across user environments
- increases install/runtime complexity
- violates the “lightweight” requirement in practice

## Recommended Architecture

Use **Option 2: Thin Launcher + First-Run Runtime Download**.

### Package Shape

Publish one public npm package:

- name: `taskhelm`

It contains:

- compiled CLI entrypoint
- runtime bootstrap/launcher
- config/version helpers
- browser-open helper
- runtime downloader/cache manager

It does **not** contain:

- full Next.js source tree
- test files
- docs
- dev-only monorepo tooling

### Runtime Artifact

Each release produces a prebuilt web runtime bundle based on Next standalone output.

Artifact contents:

- standalone web server output
- required static assets
- minimal runtime manifest

Artifact characteristics:

- versioned by TaskHelm version
- platform-neutral where possible
- excludes development-only files

Expected local cache location:

- `~/.taskhelm/runtime/<version>/...`

### Launcher Flow

When user runs `taskhelm` with no subcommand:

1. Resolve config and user data dir
2. Ensure SQLite path exists
3. Check whether runtime bundle for current package version exists locally
4. If missing:
   - download manifest
   - download runtime bundle
   - unpack into cache dir
   - verify expected entrypoint exists
5. Start the local web runtime on port `4100`
6. Wait for health check success
7. Open browser to `http://127.0.0.1:4100`
8. Keep process attached unless detached mode is added later

When user runs `taskhelm <subcommand>`:

- continue to execute the CLI command path directly

## Web Runtime Requirements

### Build Output

`@taskhelm/web` should build in standalone mode so the launcher does not need the monorepo present after install.

The web runtime should:

- run on Node without Next dev mode
- honor `PORT=4100` by default
- honor `TASKHELM_DB`
- use dynamic rendering for DB-backed pages, which is already aligned with the local-first runtime model

### Start Command

The runtime entrypoint should be launchable by the npm package via a plain Node child process, not by `next dev`.

The launcher should treat the web app as a production local server, not as a dev server.

## Configuration

### Defaults

- port: `4100`
- host: `127.0.0.1`
- db path: `~/.taskhelm/taskhelm.db`
- runtime cache: `~/.taskhelm/runtime/<version>`

### Overridable Later

Not required in phase 1, but architecture should leave room for:

- custom port
- custom DB path
- no-browser mode
- force re-download
- clear runtime cache

## Release Pipeline Requirements

Each release should produce two artifacts:

1. npm package `taskhelm`
2. web runtime bundle for the same version

The launcher needs a stable mapping from npm package version to runtime bundle URL.

Minimal contract:

- version manifest URL
- bundle URL
- checksum or integrity field

## Failure Handling

### Download Failures

If the runtime cannot be downloaded:

- fail with a clear error
- explain that TaskHelm could not fetch the local web runtime
- preserve any existing cached version

### Start Failures

If port `4100` is already taken:

- fail with a clear message in phase 1
- do not silently switch ports

If the runtime process crashes before health check:

- surface stderr summary
- do not open browser

### Cache Corruption

If cached runtime is incomplete or invalid:

- remove only that version folder
- re-download once

## Security / Safety Notes

- Runtime download must be version-pinned and integrity-checked
- The launcher should only execute a known local runtime entrypoint inside the versioned cache dir
- No arbitrary remote code execution via manifest fields
- Browser opening should only target the local URL

## Phase Breakdown

### Phase 1

- make root package publishable
- keep existing CLI commands working
- add zero-arg launcher behavior
- produce standalone web runtime bundle
- implement first-run download + cache + launch on `4100`

### Phase 2

- add update detection
- add cache cleanup command
- add no-browser and custom-port options
- improve offline handling

## Success Criteria

- `npm i -g taskhelm`
- `taskhelm` launches local web app on `http://127.0.0.1:4100`
- browser opens automatically
- npm install size stays materially smaller than shipping the entire web runtime inside the package
- `taskhelm project ...` and `taskhelm task ...` still work as CLI commands

