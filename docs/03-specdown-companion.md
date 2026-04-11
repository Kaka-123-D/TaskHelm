# SpecDown Companion Strategy

## Principle

TaskHelm must work without SpecDown.

TaskHelm should work best with SpecDown.

This is the strategic balance that makes the open-source product adoptable while still creating a strong ecosystem pull toward `specdown.app`.

## Role of SpecDown

SpecDown is not the runtime control plane.

SpecDown is the ideal companion for the spec and context layer:

- context documents
- plans
- handoffs
- review notes
- project-level knowledge

## Why SpecDown Fits

From the current local SpecDown codebase and docs, the platform already exposes the capabilities TaskHelm needs at the document layer:

- Markdown project workspace
- CLI for read, pull, push, search, and project selection
- MCP server for AI-native document access
- git-aware spec workflows

That makes SpecDown a strong companion for:

- human authoring
- AI context retrieval
- context publishing and synchronization

## Recommended Integration Modes

### Mode A: Local-Only

TaskHelm stores task memory only on local disk.

Good for:

- zero-config OSS onboarding
- private local use
- offline-friendly workflows

### Mode B: SpecDown Sync

Task memory exists locally and syncs to a SpecDown project.

Good for:

- centralized context browsing
- richer review artifacts
- AI access via SpecDown MCP

### Mode C: SpecDown-Backed Team Context

TaskHelm remains single-user in v1, but may read richer shared context from SpecDown project documents.

Good for:

- shared design docs
- architecture references
- policy and checklists

## V1 Integration Targets

The first SpecDown integration points should be:

1. attach a TaskHelm workspace to a SpecDown project
2. pull project context into task capsules
3. push task artifacts back to SpecDown
4. let manager and workers resolve context through SpecDown MCP

## Product Message

The OSS message should be:

- use TaskHelm alone if you want a local AI manager
- add SpecDown if you want an AI-native spec memory layer

The ecosystem message should be:

- SpecDown stores the specs
- TaskHelm runs the work

## Design Constraint

TaskHelm should never feel like a thin wrapper around a SaaS.

SpecDown integration should feel like a power-up, not a dependency trap.
