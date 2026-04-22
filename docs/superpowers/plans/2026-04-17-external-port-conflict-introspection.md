# External Port Conflict Introspection Plan

## Scope

Implement structured external-port conflict detection for preferred-port dev starts and render that information in the task detail `Dev Server` panel, with an explicit kill action when a PID is available.

## Tasks

1. Add OS port-inspection helper
   - introduce a small helper in `packages/web/src/lib/dev/` or equivalent to:
     - probe whether a port is listening
     - read PID/command/user/cwd best-effort on macOS
   - keep helper return shape structured and nullable per field

2. Update dev start route
   - modify `packages/web/src/app/api/tasks/[taskId]/dev/route.ts`
   - preserve existing `TaskHelm` DB reservation checks
   - when `preferredPort` is supplied, probe OS port usage
   - if external process occupies the port, return `409` structured payload with conflict details

3. Add external-process kill endpoint behavior
   - extend the same route or add a focused action path for killing by PID
   - require explicit PID from probed conflict state
   - refresh panel state after success; do not auto-start dev server

4. Update `DevServerPanel`
   - parse structured conflict response
   - render conflict card with port/PID/command/user/cwd where available
   - show `Kill external process` only when PID exists
   - keep existing `Start`, `Stop`, `Open`, and save-port behavior intact

5. Add tests
   - route tests for:
     - external process conflict payload
     - normal start path still working
     - kill action success/failure
   - panel tests for:
     - conflict rendering
     - conditional kill button visibility

6. Verification
   - targeted vitest for dev route and panel
   - `pnpm --dir packages/web run typecheck`
   - `pnpm --dir packages/web run build`
   - `gitnexus_detect_changes({ scope: "all" })` before close-out

## Notes

- keep scope limited to task detail first
- do not broaden to task list or dev pool UI in this patch
- keep kill flow explicit and reversible only by user action
