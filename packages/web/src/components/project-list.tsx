'use client'

import { motion } from 'motion/react'
import type { Project } from '@taskhelm/core'
import { ProjectCard } from '@/components/project-card'

interface ProjectWithCounts {
  readonly project: Project
  readonly taskCount: number
  readonly runningCount: number
}

interface ProjectListProps {
  readonly projects: readonly ProjectWithCounts[]
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="projects-grid rounded-[1.5rem] border border-[var(--border)] bg-[rgba(255,255,255,0.56)] px-6 py-16 text-center shadow-[var(--shadow-card)]">
        <p className="mb-2 text-lg font-semibold text-[var(--text-primary)]">No projects yet</p>
        <p className="text-sm text-[var(--text-secondary)]">Use the orange action button above to create your first tracked repo.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="projects-grid grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {projects.map(({ project, taskCount, runningCount }) => (
        <motion.div
          className="h-full"
          data-slot="project-card-cell"
          key={project.id}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <ProjectCard project={project} taskCount={taskCount} runningCount={runningCount} />
        </motion.div>
      ))}
    </motion.div>
  )
}
