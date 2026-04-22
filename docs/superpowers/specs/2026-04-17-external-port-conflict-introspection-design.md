# External Port Conflict Introspection Design

## Goal

Make `TaskHelm` explain external port conflicts clearly when a user tries to start a dev server with a preferred port that is already occupied by a process outside `TaskHelm`.

Instead of surfacing a raw database or port-allocation failure, the task detail `Dev Server` panel should show what is currently using the port so the user can decide whether to stop that external process.

## Current Problem

`POST /api/tasks/[taskId]/dev` currently treats port ownership as mostly a database concern:

- if `Preferred Port` is set, it checks `dev_servers` in SQLite
- if the port is not reserved in `TaskHelm`, it attempts to spawn the dev command

This misses an important case:

- a completely external process can already be listening on that port
- the UI does not explain what that process is
- the user sees an opaque error path instead of actionable information

## Desired Behavior

When the user tries to start a dev server with a preferred port:

- `TaskHelm` must still respect its own `dev_servers` reservations
- `TaskHelm` must also probe the actual operating system port state
- if a non-`TaskHelm` process is already listening on that port, start must fail cleanly and return structured conflict data

In the task detail `Dev Server` panel, that conflict should render as a dedicated warning surface with any information `TaskHelm` can retrieve, including:

- port
- PID
- process/command
- user
- working directory if available

The user can then decide whether to stop that process.

## Design

### OS-level port introspection

Add a small OS probe layer for macOS-local development that inspects a listening port and returns structured metadata.

The probe should:

- detect whether the preferred port is already in use
- extract process details from the system, not from `TaskHelm` state
- remain best-effort: if some metadata cannot be obtained, the route should still return the data it does have

Expected shape:

- `inUse: boolean`
- `pid: number | null`
- `command: string | null`
- `user: string | null`
- `cwd: string | null`

### Start-dev route behavior

`POST /api/tasks/[taskId]/dev` should change as follows for preferred-port starts:

- check `TaskHelm` DB reservation state first
- then probe the real OS port
- if the port is occupied externally:
  - do not spawn the dev server
  - return `409` with a structured payload such as:
    - `error`
    - `conflictType: "external_port_in_use"`
    - `port`
    - `process`

The route should only treat the conflict as external when it is not already explained by an active `dev_servers` record for the same port.

### Dev Server panel UI

`DevServerPanel` should render a dedicated conflict card when this route response is received.

The panel should show:

- a clear heading like `Port 11328 is already in use`
- the discovered process details
- a note that this process is outside `TaskHelm`

The panel should not auto-kill anything.

### Kill action

Expose a `Kill external process` action only when the OS probe returned a valid PID.

Behavior:

- user must click it explicitly
- the kill is targeted by PID, not by vague command matching
- after successful kill, refresh the panel and let the user click `Start` again manually

`TaskHelm` should not auto-start the dev server after killing the external process in this patch.

## Safety Rules

- never kill automatically
- never show a kill button when there is no PID
- never claim ownership of the process as a `TaskHelm` server if it came only from OS probing
- keep database-backed `TaskHelm` dev server lifecycle unchanged

## Testing

- route test for preferred-port conflict caused by external process metadata
- route test for existing `TaskHelm` reservation conflict still behaving correctly
- UI test for rendering external-process conflict details in `DevServerPanel`
- UI test for showing kill button only when PID exists

## Non-Goals

- no automatic reclaim or force-start flow
- no new global process manager screen
- no task list integration for external-process kill in this patch
- no cross-platform deep process inspection beyond the current local macOS-focused workflow
