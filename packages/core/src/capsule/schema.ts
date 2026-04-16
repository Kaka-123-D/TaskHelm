import { z } from 'zod'

export const TaskCapsuleSchema = z.object({
  id: z.string(),
  project_slug: z.string(),
  title: z.string(),
  goal: z.string().optional(),
  referLink: z.string().url().optional(),
  priority: z.number().int().default(0),
  branch_name: z.string().optional(),
  worktree_path: z.string().optional(),
  port: z.number().int().optional(),
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
