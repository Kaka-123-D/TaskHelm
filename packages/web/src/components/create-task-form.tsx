'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    },
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [form, projectId, router]
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        + New Task
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg shadow-2xl"
      >
        <h3 className="text-lg font-semibold mb-4">Create Task</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Title *</span>
            <input
              type="text"
              value={form.title}
              onChange={updateField('title')}
              placeholder="Add user authentication"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Goal</span>
            <input
              type="text"
              value={form.goal}
              onChange={updateField('goal')}
              placeholder="Implement JWT-based auth with login/signup flows"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Priority</span>
            <select
              value={form.priority}
              onChange={updateField('priority')}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Source Type</span>
              <input
                type="text"
                value={form.sourceType}
                onChange={updateField('sourceType')}
                placeholder="github_issue"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Source Ref</span>
              <input
                type="text"
                value={form.sourceRef}
                onChange={updateField('sourceRef')}
                placeholder="#42"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => { setOpen(false); setForm(INITIAL_STATE); setError(null) }}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !form.title}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
