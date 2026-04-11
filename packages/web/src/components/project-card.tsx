import type { Project } from '@taskhelm/core'
import Link from 'next/link'

interface ProjectCardProps {
  project: Project
  taskCount: number
  activeCount: number
  blockedCount: number
}

export function ProjectCard({ project, taskCount, activeCount, blockedCount }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.slug}`}>
      <div className="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 hover:bg-zinc-900/50 transition-all cursor-pointer">
        <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{project.description}</p>
        )}
        <div className="text-xs text-zinc-500 mb-3 font-mono truncate">{project.local_repo_root}</div>
        <div className="flex gap-4 text-sm">
          <span className="text-zinc-400">{taskCount} tasks</span>
          {activeCount > 0 && <span className="text-blue-400">{activeCount} active</span>}
          {blockedCount > 0 && <span className="text-red-400">{blockedCount} blocked</span>}
        </div>
        <div className="mt-2 flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            project.specdown_mode === 'disabled'
              ? 'bg-zinc-800 text-zinc-500'
              : 'bg-blue-900/30 text-blue-400'
          }`}>
            SpecDown: {project.specdown_mode}
          </span>
        </div>
      </div>
    </Link>
  )
}
