import * as fs from 'node:fs'
import * as path from 'node:path'
import { stringify } from 'yaml'
import type { Task, Project } from '../types.js'

export interface WriteCapsuleInput {
  readonly baseDir: string
  readonly projectSlug: string
  readonly task: Task
  readonly project: Project
}

export function writeCapsule(input: WriteCapsuleInput): string {
  const { baseDir, projectSlug, task, project: _project } = input

  const capsuleDir = path.join(baseDir, 'projects', projectSlug, 'tasks', task.id)
  fs.mkdirSync(capsuleDir, { recursive: true })
  fs.mkdirSync(path.join(capsuleDir, 'artifacts'), { recursive: true })

  writeTaskYaml(capsuleDir, task, projectSlug)
  writeContextMd(capsuleDir, task)
  writePlanMd(capsuleDir, task)
  writeHandoffMd(capsuleDir, task)
  writeReviewMd(capsuleDir, task)

  return capsuleDir
}

function buildCapsuleData(task: Task, projectSlug: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: task.id,
    project_slug: projectSlug,
    title: task.title,
    priority: task.priority,
    updated_at: task.updated_at,
  }

  if (task.goal !== null) {
    data.goal = task.goal
  }

  if (task.source_type !== null || task.source_ref !== null) {
    data.source = {
      type: task.source_type,
      ref: task.source_ref,
    }
  }

  if (task.branch_name !== null) {
    data.branch_name = task.branch_name
  }

  if (task.worktree_path !== null) {
    data.worktree_path = task.worktree_path
  }

  if (task.port !== null) {
    data.port = task.port
  }

  return data
}

function writeTaskYaml(capsuleDir: string, task: Task, projectSlug: string): void {
  const data = buildCapsuleData(task, projectSlug)
  const yamlContent = stringify(data)
  fs.writeFileSync(path.join(capsuleDir, 'task.yaml'), yamlContent, 'utf-8')
}

function writeContextMd(capsuleDir: string, task: Task): void {
  const content = `# Context: ${task.title}

## Source

<!-- Link to the originating issue, ticket, or request -->

## Scope

<!-- What is included in this task -->

## Assumptions

<!-- Any assumptions made when scoping this task -->

## Out of Scope

<!-- What is explicitly excluded from this task -->
`
  fs.writeFileSync(path.join(capsuleDir, 'context.md'), content, 'utf-8')
}

function writePlanMd(capsuleDir: string, task: Task): void {
  const content = `# Plan: ${task.title}

## Requirements

<!-- List of functional and non-functional requirements -->

## Implementation Plan

<!-- Step-by-step implementation approach -->

## Verification Checklist

<!-- Checklist of items to verify before marking task done -->

## Open Questions

<!-- Questions that need to be resolved before or during implementation -->
`
  fs.writeFileSync(path.join(capsuleDir, 'plan.md'), content, 'utf-8')
}

function writeHandoffMd(capsuleDir: string, task: Task): void {
  const content = `# Handoff: ${task.title}

## Current Status

<!-- Current state of the task -->

## What Changed

<!-- Summary of changes made in this session -->

## Blockers

<!-- Any blockers preventing progress -->

## Next Action

<!-- What needs to happen next -->
`
  fs.writeFileSync(path.join(capsuleDir, 'handoff.md'), content, 'utf-8')
}

function writeReviewMd(capsuleDir: string, task: Task): void {
  const content = `# Review: ${task.title}

## Spec Compliance

<!-- Assessment of how well the implementation matches the spec -->

## Code Quality

<!-- Assessment of code quality, patterns, and maintainability -->

## Runtime Verification

<!-- Results of runtime testing and verification -->

## Recommendation

<!-- Final recommendation: pass, fail, or conditional pass with required changes -->
`
  fs.writeFileSync(path.join(capsuleDir, 'review.md'), content, 'utf-8')
}
