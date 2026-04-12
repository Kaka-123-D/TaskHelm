'use client'

import { useState, useCallback } from 'react'
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
  readonly testCommand: string
  readonly maxDevServers: string
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: project.name,
    description: project.description ?? '',
    devCommand: project.dev_command ?? '',
    installCommand: project.install_command ?? '',
    testCommand: project.test_command ?? '',
    maxDevServers: String(project.max_active_dev_servers),
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
      const body: Record<string, string | number> = { name: form.name }
      body.description = form.description || ''
      if (form.devCommand) body.dev_command = form.devCommand
      if (form.installCommand) body.install_command = form.installCommand
      if (form.testCommand) body.test_command = form.testCommand
      body.max_active_dev_servers = parseInt(form.maxDevServers, 10) || 3

      const res = await fetch(`/api/projects/${project.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update project')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
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
            <div className="mb-4 p-3 rounded-[var(--glass-radius-sm)] text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)' }}>
              {error}
            </div>
          )}
          <div className="space-y-3">
            <GlassInput label="Name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Project name" />
            <GlassInput label="Description" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Description" />
            <GlassInput label="Dev Command" value={form.devCommand} onChange={e => updateField('devCommand', e.target.value)} placeholder="npm run dev" />
            <GlassInput label="Install Command" value={form.installCommand} onChange={e => updateField('installCommand', e.target.value)} placeholder="npm install" />
            <GlassInput label="Test Command" value={form.testCommand} onChange={e => updateField('testCommand', e.target.value)} placeholder="npm test" />
            <GlassInput label="Max Dev Servers" type="number" value={form.maxDevServers} onChange={e => updateField('maxDevServers', e.target.value)} placeholder="3" />
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
