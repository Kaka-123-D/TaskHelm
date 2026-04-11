import { describe, it, expect } from 'vitest'
import { TaskCapsuleSchema } from '../../src/capsule/schema.js'

const validCompleteCapsule = {
  id: 'task-001',
  project_slug: 'my-project',
  title: 'Implement feature X',
  goal: 'Add X functionality to the system',
  source: {
    type: 'github_issue',
    ref: 'https://github.com/org/repo/issues/42',
  },
  status: 'ready' as const,
  phase: 'planning' as const,
  priority: 5,
  branch_name: 'feature/task-001-implement-x',
  worktree_path: '/home/user/worktrees/task-001',
  port: 3001,
  specdown: {
    mode: 'linked' as const,
    project_ref: 'spec-project',
    doc_refs: ['docs/spec.md', 'docs/api.md'],
  },
  reviews: {
    spec_compliance: 'pending' as const,
    code_quality: 'open' as const,
    runtime_verification: 'passed' as const,
  },
  updated_at: '2026-04-11T10:00:00.000Z',
}

const validMinimalCapsule = {
  id: 'task-002',
  project_slug: 'simple-project',
  title: 'Fix bug',
  status: 'draft' as const,
  phase: 'context' as const,
  updated_at: '2026-04-11T10:00:00.000Z',
}

describe('TaskCapsuleSchema', () => {
  describe('valid capsules', () => {
    it('accepts a valid complete capsule', () => {
      const result = TaskCapsuleSchema.safeParse(validCompleteCapsule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('task-001')
        expect(result.data.title).toBe('Implement feature X')
        expect(result.data.status).toBe('ready')
        expect(result.data.phase).toBe('planning')
      }
    })

    it('accepts a valid minimal capsule with only required fields', () => {
      const result = TaskCapsuleSchema.safeParse(validMinimalCapsule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('task-002')
        expect(result.data.priority).toBe(0) // default value
      }
    })

    it('applies default priority of 0 when not provided', () => {
      const result = TaskCapsuleSchema.safeParse(validMinimalCapsule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe(0)
      }
    })

    it('applies default doc_refs of [] when specdown provided without doc_refs', () => {
      const capsule = {
        ...validMinimalCapsule,
        specdown: {
          mode: 'disabled' as const,
        },
      }
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.specdown?.doc_refs).toEqual([])
      }
    })

    it('accepts all valid status values', () => {
      const statuses = ['draft', 'ready', 'running', 'reviewing', 'blocked', 'done', 'archived'] as const
      for (const status of statuses) {
        const result = TaskCapsuleSchema.safeParse({ ...validMinimalCapsule, status })
        expect(result.success).toBe(true)
      }
    })

    it('accepts all valid phase values', () => {
      const phases = [
        'context',
        'planning',
        'implementation',
        'spec_review',
        'code_review',
        'runtime_verification',
        'final_summary',
      ] as const
      for (const phase of phases) {
        const result = TaskCapsuleSchema.safeParse({ ...validMinimalCapsule, phase })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('invalid capsules', () => {
    it('rejects an invalid status value', () => {
      const capsule = { ...validMinimalCapsule, status: 'invalid_status' }
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects an invalid phase value', () => {
      const capsule = { ...validMinimalCapsule, phase: 'invalid_phase' }
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects when id is missing', () => {
      const { id: _id, ...capsule } = validMinimalCapsule
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects when project_slug is missing', () => {
      const { project_slug: _slug, ...capsule } = validMinimalCapsule
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects when title is missing', () => {
      const { title: _title, ...capsule } = validMinimalCapsule
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects when status is missing', () => {
      const { status: _status, ...capsule } = validMinimalCapsule
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects when phase is missing', () => {
      const { phase: _phase, ...capsule } = validMinimalCapsule
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects when updated_at is missing', () => {
      const { updated_at: _updated_at, ...capsule } = validMinimalCapsule
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })

    it('rejects invalid review status values', () => {
      const capsule = {
        ...validMinimalCapsule,
        reviews: {
          spec_compliance: 'invalid',
          code_quality: 'pending',
          runtime_verification: 'pending',
        },
      }
      const result = TaskCapsuleSchema.safeParse(capsule)
      expect(result.success).toBe(false)
    })
  })
})
