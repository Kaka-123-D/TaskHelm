'use client'

import type { Project } from '@taskhelm/core'
import Link from 'next/link'
import { GlassCard } from '@/components/design-system/glass-card'
import { StatusDot } from '@/components/design-system/status-dot'

interface ProjectCardProps {
  readonly project: Project
  readonly taskCount: number
  readonly runningCount: number
}

export function ProjectCard({ project, taskCount, runningCount }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.slug}`}>
      <GlassCard className="p-5">
        <h3 className="font-semibold text-base text-[var(--text-primary)] mb-1">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{project.description}</p>
        )}
        <div className="text-xs font-mono text-[var(--text-muted)] mb-3 truncate">
          {project.local_repo_root}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--text-secondary)]">{taskCount} tasks</span>
          {runningCount > 0 && (
            <span className="flex items-center gap-1.5">
              <StatusDot status="running" />
              <span className="text-[var(--primary)]">{runningCount} running</span>
            </span>
          )}
        </div>
      </GlassCard>
    </Link>
  )
}
