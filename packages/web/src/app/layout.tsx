import type { Metadata } from 'next'
import './globals.css'
import { GlassSidebar } from '@/components/glass-sidebar'
import { ProjectRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

export const metadata: Metadata = {
  title: 'TaskHelm',
  description: 'Autonomous AI engineering manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const projects = projectRepo.findAll()
  const recentProjects = projects.slice(0, 5).map(p => ({ name: p.name, slug: p.slug }))

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <GlassSidebar recentProjects={recentProjects} />
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
