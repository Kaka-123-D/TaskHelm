'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@taskhelm/core'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassButton } from '@/components/design-system/glass-button'

interface EditProjectFormProps {
  readonly project: Project
}

interface FormState {
  readonly name: string
  readonly description: string
  readonly devCommand: string
  readonly installCommand: string
  readonly maxDevServers: string
  readonly isMultiRepo: boolean
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: project.name,
    description: project.description ?? '',
    devCommand: project.dev_command ?? '',
    installCommand: project.install_command ?? '',
    maxDevServers: String(project.max_active_dev_servers),
    isMultiRepo: project.is_multi_repo,
  })
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isPending, startTransition] = useTransition()
  const submitting = isFetching || isPending
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState, value: string | boolean) => {
      setForm(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsFetching(true)
    try {
      const body: Record<string, string | number | boolean> = { name: form.name }
      body.description = form.description || ''
      if (form.devCommand) body.dev_command = form.devCommand
      if (form.installCommand) body.install_command = form.installCommand
      body.max_active_dev_servers = parseInt(form.maxDevServers, 10) || 3
      body.is_multi_repo = form.isMultiRepo

      const res = await fetch(`/api/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update project')
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
  }, [form, project.slug, router])

  return (
    <>
      <GlassButton variant="secondary" onClick={() => setOpen(true)} className="text-xs px-3 py-1.5">
        Edit
      </GlassButton>

      <GlassModal open={open} onClose={() => setOpen(false)} title="Edit Project">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-[var(--glass-radius-sm)] border p-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)', borderColor: 'rgba(204, 80, 56, 0.18)' }}>
              {error}
            </div>
          )}
          <div className="space-y-3">
            <GlassInput label="Name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Project name" />
            <GlassInput label="Description" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Description" />
            <div>
              <GlassInput label="Dev Command" value={form.devCommand} onChange={e => updateField('devCommand', e.target.value)} placeholder="npm run dev -- -p {{port}}" />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Use <code>{'{{port}}'}</code> to inject the allocated port (e.g.{' '}
                <code>npm run dev -- -p {'{{port}}'}</code>) when your script hard-codes one.
              </p>
            </div>
            <GlassInput label="Install Command" value={form.installCommand} onChange={e => updateField('installCommand', e.target.value)} placeholder="npm install" />
            <GlassInput label="Max Dev Servers" type="number" value={form.maxDevServers} onChange={e => updateField('maxDevServers', e.target.value)} placeholder="3" />
            <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={form.isMultiRepo}
                onChange={e => updateField('isMultiRepo', e.target.checked)}
                className="mt-1"
              />
              <span>
                Multi-repo workspace
                <span className="block text-xs text-[var(--text-muted)]">
                  Project chứa nested repos (mỗi task có worktree + dev server riêng cho từng subrepo).
                </span>
              </span>
            </label>
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
