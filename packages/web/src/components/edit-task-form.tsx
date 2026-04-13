'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@taskhelm/core'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'
import { GlassButton } from '@/components/design-system/glass-button'

interface EditTaskFormProps {
  readonly task: Task
  readonly projectSlug: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'running', label: 'Running' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Critical' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Low' },
  { value: '5', label: 'Backlog' },
]

interface FormState {
  readonly title: string
  readonly goal: string
  readonly status: string
  readonly priority: string
}

export function EditTaskForm({ task, projectSlug: _projectSlug }: EditTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: task.title,
    goal: task.goal ?? '',
    status: task.status,
    priority: String(task.priority),
  })
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
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          goal: form.goal || null,
          status: form.status,
          priority: parseInt(form.priority, 10),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update task')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [form, task.id, router])

  return (
    <>
      <GlassButton variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
        Edit
      </GlassButton>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Edit Task">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-[var(--glass-radius-sm)] border p-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)', borderColor: 'rgba(204, 80, 56, 0.18)' }}>
              {error}
            </div>
          )}
          <div className="space-y-3">
            <GlassInput label="Title" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Task title" />
            <GlassInput label="Goal" value={form.goal} onChange={e => updateField('goal', e.target.value)} placeholder="Task goal" />
            <GlassSelect label="Status" options={STATUS_OPTIONS} value={form.status} onChange={e => updateField('status', e.target.value)} />
            <GlassSelect label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={e => updateField('priority', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <GlassButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting}>Save</GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
