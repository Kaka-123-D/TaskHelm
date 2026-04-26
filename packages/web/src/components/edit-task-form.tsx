'use client'

import { useState, useCallback, useTransition } from 'react'
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
  readonly referLink: string
  readonly priority: string
}

function normalizeReferLink(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return new URL(trimmed).toString()
}

export function EditTaskForm({ task, projectSlug: _projectSlug }: EditTaskFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: task.title,
    goal: task.goal ?? '',
    referLink: task.refer_link ?? '',
    priority: String(task.priority),
  })
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

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          goal: form.goal || null,
          refer_link: referLink,
          priority: parseInt(form.priority, 10),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update task')
      }
      startTransition(() => {
        router.refresh()
        setOpen(false)
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsFetching(false)
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
            <GlassInput
              label="Refer Link"
              value={form.referLink}
              onChange={e => updateField('referLink', e.target.value)}
              placeholder="https://example.com/tickets/42"
            />
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
