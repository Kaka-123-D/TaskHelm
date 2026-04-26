import type { Metadata } from 'next'
import './globals.css'
import { GlassSidebar } from '@/components/glass-sidebar'
import { OnboardingTrigger } from '@/components/welcome-modal'
import { ProjectRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'

export const metadata: Metadata = {
  title: 'TaskHelm',
  description: 'Autonomous AI engineering manager',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const projectRepo = new ProjectRepository(db)
  const projects = projectRepo.findAll()
  const recentProjects = projects.slice(0, 5).map(p => ({ name: p.name, slug: p.slug }))

  return (
    <html lang="en">
      <body className="app-body min-h-screen antialiased">
        <div className="app-workbench">
          <div className="app-window">
            <header className="app-chrome">
              <div className="app-chrome-controls" aria-hidden="true">
                <span className="app-chrome-dot" data-tone="warm" />
                <span className="app-chrome-dot" data-tone="blue" />
                <span className="app-chrome-dot" data-tone="neutral" />
              </div>
              <div className="app-chrome-title">taskhelm.workspace</div>
              <div className="app-chrome-status">Local workbench</div>
            </header>

            <div className="app-shell">
              <GlassSidebar recentProjects={recentProjects} />
              <main className="app-main">{children}</main>
            </div>
          </div>
        </div>
        <OnboardingTrigger />
      </body>
    </html>
  )
}
