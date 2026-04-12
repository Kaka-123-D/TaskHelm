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
      <div className="text-center py-20">
        <p className="text-lg mb-2 text-[var(--text-secondary)]">No projects yet</p>
        <p className="text-sm text-[var(--text-muted)]">Click &quot;+ New Project&quot; above to get started.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {projects.map(({ project, taskCount, runningCount }) => (
        <motion.div
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
