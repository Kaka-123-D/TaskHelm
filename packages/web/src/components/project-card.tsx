'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Project } from '@taskhelm/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/design-system/glass-card'
import { StatusDot } from '@/components/design-system/status-dot'
import { DeleteConfirm } from '@/components/delete-confirm'

interface ProjectCardProps {
  readonly project: Project
  readonly taskCount: number
  readonly runningCount: number
}

export function ProjectCard({ project, taskCount, runningCount }: ProjectCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleToggleMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setMenuOpen(open => !open)
  }, [])

  const handleDeleteProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.slug}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error ?? 'Failed to delete project')
    }

    startTransition(() => {
      router.refresh()
    })
  }, [project.slug, router])

  const taskLabel = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`

  return (
    <div className="relative h-full">
      <Link className="block h-full" href={`/projects/${project.slug}`}>
        <GlassCard className="project-card-surface flex h-full flex-col p-5 md:p-6">
          <div className="mb-3">
            <div className="project-card-overline">Local Project</div>
            <h3 className="mt-2 pr-10 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{project.name}</h3>
          </div>
          <p
            className="mb-4 min-h-12 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]"
            data-slot="project-description"
          >
            {project.description ?? ''}
          </p>
          <div className="mt-auto flex flex-col gap-4">
            <div className="project-card-path truncate font-mono text-xs">{project.local_repo_root}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="project-card-pill">{taskLabel}</span>
              {runningCount > 0 && (
                <span className="project-card-pill" data-tone="accent">
                  <StatusDot status="running" />
                  <span>{runningCount} running</span>
                </span>
              )}
            </div>
          </div>
        </GlassCard>
      </Link>

      <div ref={menuRef} className="project-card-overflow absolute top-4 right-4 z-20">
        <div className="relative">
          <button
            type="button"
            aria-label={`Project actions for ${project.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="project-card-overflow-trigger"
            data-slot="project-card-overflow-trigger"
            onClick={handleToggleMenu}
          >
            ⋮
          </button>

          <div
            className="project-card-overflow-menu"
            data-slot="project-card-overflow-menu"
            data-state={menuOpen ? 'open' : 'closed'}
            onClick={event => event.stopPropagation()}
          >
            <DeleteConfirm
              label="Delete project"
              confirmText={`Delete project "${project.name}"? This cannot be undone.`}
              onConfirm={handleDeleteProject}
              renderTrigger={({ open }) => (
                <button
                  type="button"
                  className="project-card-overflow-item"
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    setMenuOpen(false)
                    open()
                  }}
                >
                  Delete project
                </button>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
