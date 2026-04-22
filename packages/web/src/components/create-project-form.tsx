'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassButton } from '@/components/design-system/glass-button'
import { FolderPicker } from '@/components/folder-picker'

interface FormState {
  readonly name: string
  readonly slug: string
  readonly localRepoRoot: string
  readonly description: string
  readonly defaultBranch: string
  readonly devCommand: string
  readonly installCommand: string
}

const INITIAL_STATE: FormState = {
  name: '',
  slug: '',
  localRepoRoot: '',
  description: '',
  defaultBranch: '',
  devCommand: '',
  installCommand: '',
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function CreateProjectForm() {
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

  const autoSlug = useCallback((name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === toSlug(prev.name) ? toSlug(name) : prev.slug,
    }))
  }, [])

  const handleFolderSelect = useCallback((folderPath: string) => {
    const folderName = folderPath.split('/').pop() ?? ''
    setForm(prev => ({
      ...prev,
      localRepoRoot: folderPath,
      name: prev.name === '' ? folderName : prev.name,
      slug: prev.slug === '' ? toSlug(folderName) : prev.slug,
    }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, string | undefined> = {
        name: form.name,
        slug: form.slug,
        local_repo_root: form.localRepoRoot,
      }
      if (form.description) body.description = form.description
      if (form.defaultBranch) body.default_branch = form.defaultBranch
      if (form.devCommand) body.dev_command = form.devCommand
      if (form.installCommand) body.install_command = form.installCommand
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create project')
      }
      setForm(INITIAL_STATE)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [form, router])

  const handleClose = useCallback(() => {
    setOpen(false)
    setForm(INITIAL_STATE)
    setError(null)
  }, [])

  return (
    <>
      <GlassButton onClick={() => setOpen(true)} className="min-w-[11rem]">
        + New Project
      </GlassButton>

      <GlassModal open={open} onClose={handleClose} title="Create Project">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-[var(--glass-radius-sm)] border p-3 text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-hover)', borderColor: 'rgba(204, 80, 56, 0.18)' }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Repository Folder *</span>
              <FolderPicker value={form.localRepoRoot} onChange={handleFolderSelect} />
            </div>
            <GlassInput label="Name *" value={form.name} onChange={e => autoSlug(e.target.value)} placeholder="My Project" />
            <GlassInput label="Slug *" value={form.slug} onChange={e => updateField('slug', e.target.value)} placeholder="my-project" />
            <GlassInput label="Description" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Optional description" />
            <GlassInput label="Default Branch" value={form.defaultBranch} onChange={e => updateField('defaultBranch', e.target.value)} placeholder="main" />
            <GlassInput label="Dev Command" value={form.devCommand} onChange={e => updateField('devCommand', e.target.value)} placeholder="npm run dev" />
            <GlassInput label="Install Command" value={form.installCommand} onChange={e => updateField('installCommand', e.target.value)} placeholder="npm install" />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <GlassButton type="button" variant="ghost" onClick={handleClose}>Cancel</GlassButton>
            <GlassButton type="submit" loading={submitting} disabled={!form.name || !form.slug || !form.localRepoRoot}>
              Create Project
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </>
  )
}
