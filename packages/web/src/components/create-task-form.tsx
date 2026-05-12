'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'
import { GlassButton } from '@/components/design-system/glass-button'
import { assertSafeWorktreeGroupKey } from '@/lib/tasks/worktree-group-key'

interface CreateTaskFormProps {
  readonly projectId: string
  readonly isMultiRepo?: boolean
}

interface FormState {
  readonly title: string
  readonly goal: string
  readonly referLink: string
  readonly priority: string
  readonly worktreeGroupKey: string
}

const INITIAL_STATE: FormState = {
  title: '',
  goal: '',
  referLink: '',
  priority: '3',
  worktreeGroupKey: '',
}

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Critical' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Low' },
  { value: '5', label: 'Backlog' },
]

function normalizeReferLink(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return new URL(trimmed).toString()
}

export function CreateTaskForm({ projectId, isMultiRepo = false }: CreateTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const submitting = isFetching || isPending
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsFetching(true)
    try {
      let referLink: string | null
      try {
        referLink = normalizeReferLink(form.referLink)
      } catch {
        throw new Error('Refer Link must be a valid absolute URL')
      }

      const body: Record<string, string | number> = {
        project_id: projectId,
        title: form.title,
        priority: parseInt(form.priority, 10),
      }
      if (form.goal) body.goal = form.goal
      if (referLink) body.refer_link = referLink

      if (isMultiRepo) {
        // Required: becomes the single-segment folder under .worktrees/<key>/.
        body.key = assertSafeWorktreeGroupKey(form.worktreeGroupKey)
      } else if (form.worktreeGroupKey.trim().length > 0) {
        // Optional for single-repo projects — same validation rules apply
        // whenever the user chose to set one explicitly.
        body.key = assertSafeWorktreeGroupKey(form.worktreeGroupKey)
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create task')
      }
      startTransition(() => {
        router.refresh()
        setForm(INITIAL_STATE)
        setOpen(false)
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
    }
  }, [form, projectId, router])

  const handleClose = useCallback(() => {
    setOpen(false)
    setForm(INITIAL_STATE)
    setError(null)
  }, [])

  return (
    <>
      <GlassButton onClick={() => setOpen(true)}>+ New Task</GlassButton>

      <GlassModal open={open} onClose={handleClose} title="Create Task">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-[var(--glass-radius-sm)] border p-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)', borderColor: 'rgba(204, 80, 56, 0.18)' }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <GlassInput label="Title *" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Add user authentication" />
            <GlassInput label="Goal" value={form.goal} onChange={e => updateField('goal', e.target.value)} placeholder="Implement JWT-based auth" />
            <GlassSelect label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={e => updateField('priority', e.target.value)} />
            <GlassInput
              label="Refer Link"
              value={form.referLink}
              onChange={e => updateField('referLink', e.target.value)}
              placeholder="https://example.com/tickets/42"
            />
            <GlassInput
              label={isMultiRepo ? 'Worktree folder name *' : 'Worktree folder name'}
              value={form.worktreeGroupKey}
              onChange={e => updateField('worktreeGroupKey', e.target.value)}
              placeholder={isMultiRepo ? 'LRCC-2139' : 'Optional — defaults to a generated id'}
              helperText={
                isMultiRepo
                  ? 'Becomes the folder under .worktrees/<name>/ for this multi-repo task. Letters, digits, dot, hyphen, underscore.'
                  : 'Optional. When empty, TaskHelm uses an internal id for the worktree folder.'
              }
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={handleClose}>Cancel</GlassButton>
            <GlassButton
              type="submit"
              loading={submitting}
              disabled={!form.title || (isMultiRepo && form.worktreeGroupKey.trim().length === 0)}
            >
              Create Task
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
