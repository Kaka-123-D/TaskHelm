'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'

interface NavItem {
  readonly label: string
  readonly href: string
  readonly icon: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Projects', href: '/', icon: '[ ]' },
  { label: 'Dev Servers', href: '/dev-pool', icon: '{ }' },
]

interface RecentProject {
  readonly name: string
  readonly slug: string
}

interface GlassSidebarProps {
  readonly recentProjects?: readonly RecentProject[]
}

export function GlassSidebar({ recentProjects = [] }: GlassSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="w-[220px] shrink-0 h-screen sticky top-0 p-4 flex flex-col gap-6 border-r"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--primary-muted)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--primary)' }} />
        </div>
        <span className="text-[var(--text-primary)] font-bold text-base">TaskHelm</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className="relative block">
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'var(--primary-muted)', border: '1px solid rgba(99,102,241,0.15)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className="relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: active ? 'var(--primary-hover)' : 'var(--text-secondary)' }}
              >
                <span className="font-mono text-xs opacity-60">{item.icon}</span>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="flex flex-col gap-1">
          <span
            className="px-3 text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Recent
          </span>
          {recentProjects.map(p => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}
