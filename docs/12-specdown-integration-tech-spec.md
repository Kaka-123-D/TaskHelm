# TaskHelm SpecDown Integration Technical Spec

## Integration Principle

TaskHelm does not require SpecDown to run.

TaskHelm may optionally bind each project to a SpecDown project.

## Supported Modes

- `disabled`
- `linked`
- `preferred`

Meaning:

- `disabled`: no remote sync
- `linked`: task and project docs may sync
- `preferred`: manager favors SpecDown as remote context source when available

## Integration Surfaces

### 1. CLI Bridge

Use SpecDown CLI for:

- project selection
- reading remote docs
- searching spec docs
- pushing task artifacts

Expected local dependency:

- `specdown-cli` installed or invokable

### 2. MCP Bridge

Use SpecDown MCP for:

- agent context resolution
- document search
- reading project context
- optional write-back by agents or supervisor

### 3. Local Binding Metadata

Project config should store:

- `specdown_mode`
- `specdown_project_ref`
- `specdown_doc_roots`
- `specdown_sync_policy`

## Project-Level Flow

1. user links project to SpecDown
2. TaskHelm stores binding in project config and SQLite
3. supervisor can pull project context into local project docs
4. task capsules may reference local and SpecDown doc refs

## Task-Level Flow

1. task is created inside a project
2. context pack is assembled from:
   - local project docs
   - local task docs
   - optional SpecDown project docs
3. outputs such as handoff or review may be pushed to SpecDown on explicit policy

## V1 Constraint

Do not make SpecDown integration a blocker for local-first use.

Any failure in SpecDown integration should degrade gracefully to local-only mode.
