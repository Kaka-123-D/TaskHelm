'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@taskhelm/core'
import { EditProjectForm } from '@/components/edit-project-form'
import { DeleteConfirm } from '@/components/delete-confirm'

interface ProjectActionsProps {
  readonly project: Project
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const router = useRouter()

  const handleDelete = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.slug}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to delete project')
    }
    router.push('/')
    router.refresh()
  }, [project.slug, router])

  return (
    <div className="flex gap-2">
      <EditProjectForm project={project} />
      <DeleteConfirm
        label="Delete"
        confirmText={`Delete project "${project.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
