'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'
import { GlassButton } from '@/components/design-system/glass-button'

interface CreateTaskFormProps {
  readonly projectId: string
}

interface FormState {
  readonly title: string
  readonly goal: string
  readonly sourceType: string
  readonly sourceRef: string
  readonly priority: string
}

const INITIAL_STATE: FormState = {
  title: '',
  goal: '',
  sourceType: '',
  sourceRef: '',
  priority: '3',
}

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Critical' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Low' },
  { value: '5', label: 'Backlog' },
]

export function CreateTaskForm({ projectId }: CreateTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
    setSubmitting(true)
    try {
      const body: Record<string, string | number> = {
        project_id: projectId,
        title: form.title,
        priority: parseInt(form.priority, 10),
      }
      if (form.goal) body.goal = form.goal
      if (form.sourceType) body.source_type = form.sourceType
      if (form.sourceRef) body.source_ref = form.sourceRef

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create task')
      }
      setForm(INITIAL_STATE)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
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
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Source Type" value={form.sourceType} onChange={e => updateField('sourceType', e.target.value)} placeholder="github_issue" />
              <GlassInput label="Source Ref" value={form.sourceRef} onChange={e => updateField('sourceRef', e.target.value)} placeholder="#42" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={handleClose}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting} disabled={!form.title}>
              Create Task
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
