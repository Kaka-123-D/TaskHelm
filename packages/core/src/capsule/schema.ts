import { z } from 'zod'

export const TaskCapsuleSchema = z.object({
  id: z.string(),
  project_slug: z.string(),
  title: z.string(),
  goal: z.string().optional(),
  source: z
    .object({
      type: z.string(),
      ref: z.string(),
    })
    .optional(),
  status: z.enum(['draft', 'ready', 'running', 'reviewing', 'blocked', 'done', 'archived']),
  phase: z.enum([
    'context',
    'planning',
    'implementation',
    'spec_review',
    'code_review',
    'runtime_verification',
    'final_summary',
  ]),
  priority: z.number().int().default(0),
  branch_name: z.string().optional(),
  worktree_path: z.string().optional(),
  port: z.number().int().optional(),
  specdown: z
    .object({
      mode: z.enum(['disabled', 'linked', 'preferred']),
      project_ref: z.string().optional(),
      doc_refs: z.array(z.string()).default([]),
    })
    .optional(),
  reviews: z
    .object({
      spec_compliance: z.enum(['pending', 'open', 'passed', 'failed']).default('pending'),
      code_quality: z.enum(['pending', 'open', 'passed', 'failed']).default('pending'),
      runtime_verification: z.enum(['pending', 'open', 'passed', 'failed']).default('pending'),
    })
    .optional(),
  updated_at: z.string(),
})

export type TaskCapsule = z.infer<typeof TaskCapsuleSchema>
