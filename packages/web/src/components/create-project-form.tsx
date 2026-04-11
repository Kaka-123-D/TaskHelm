'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPicker } from '@/components/folder-picker'

interface FormState {
  readonly name: string
  readonly slug: string
  readonly localRepoRoot: string
  readonly description: string
  readonly defaultBranch: string
  readonly devCommand: string
  readonly installCommand: string
  readonly testCommand: string
}

const INITIAL_STATE: FormState = {
  name: '',
  slug: '',
  localRepoRoot: '',
  description: '',
  defaultBranch: '',
  devCommand: '',
  installCommand: '',
  testCommand: '',
}

export function CreateProjectForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const updateField = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    },
    []
  )

  const autoSlug = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value
      setForm(prev => ({
        ...prev,
        name,
        slug: prev.slug === '' || prev.slug === toSlug(prev.name)
          ? toSlug(name)
          : prev.slug,
      }))
    },
    []
  )

  const handleFolderSelect = useCallback(
    (folderPath: string) => {
      const folderName = folderPath.split('/').pop() ?? ''
      setForm(prev => ({
        ...prev,
        localRepoRoot: folderPath,
        name: prev.name === '' ? folderName : prev.name,
        slug: prev.slug === '' ? toSlug(folderName) : prev.slug,
      }))
    },
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        if (form.testCommand) body.test_command = form.testCommand

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
    },
    [form, router]
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        + New Project
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg shadow-2xl"
      >
        <h3 className="text-lg font-semibold mb-4">Create Project</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Repository Folder *</span>
            <FolderPicker value={form.localRepoRoot} onChange={handleFolderSelect} />
          </label>
          <Field label="Name *" value={form.name} onChange={autoSlug} placeholder="My Project" />
          <Field label="Slug *" value={form.slug} onChange={updateField('slug')} placeholder="my-project" />
          <Field label="Description" value={form.description} onChange={updateField('description')} placeholder="Optional description" />
          <Field label="Default Branch" value={form.defaultBranch} onChange={updateField('defaultBranch')} placeholder="main" />
          <Field label="Dev Command" value={form.devCommand} onChange={updateField('devCommand')} placeholder="npm run dev" />
          <Field label="Install Command" value={form.installCommand} onChange={updateField('installCommand')} placeholder="npm install" />
          <Field label="Test Command" value={form.testCommand} onChange={updateField('testCommand')} placeholder="npm test" />
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
            disabled={submitting || !form.name || !form.slug || !form.localRepoRoot}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-400 mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </label>
  )
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
