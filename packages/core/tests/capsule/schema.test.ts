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
  priority: 5,
  branch_name: 'feature/task-001-implement-x',
  worktree_path: '/home/user/worktrees/task-001',
  port: 3001,
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
        expect(result.data).not.toHaveProperty('status')
        expect(result.data).not.toHaveProperty('phase')
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

  })

  describe('invalid capsules', () => {
    it('rejects an invalid priority value', () => {
      const capsule = { ...validMinimalCapsule, priority: 'invalid_priority' }
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
