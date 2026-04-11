import type { Metadata } from 'next'
import './globals.css'
import { ActivityFeed } from '@/components/activity-feed'
import { NotificationCenter } from '@/components/notification-center'

export const metadata: Metadata = {
  title: 'TaskHelm',
  description: 'Autonomous AI engineering manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <div className="flex min-h-screen">
          <nav className="w-64 border-r border-zinc-800 p-4 flex flex-col gap-4">
            <h1 className="text-xl font-bold tracking-tight">TaskHelm</h1>
            <a href="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              Projects
            </a>
            <a href="/dev-pool" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              Dev Server Pool
            </a>
            <NotificationCenter />
            <div className="mt-auto pt-4 border-t border-zinc-800">
              <ActivityFeed />
            </div>
          </nav>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
