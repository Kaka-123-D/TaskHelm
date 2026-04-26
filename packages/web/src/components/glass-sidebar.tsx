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
    <aside className="app-sidebar">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--primary-muted)', border: '1px solid rgba(245, 166, 35, 0.28)' }}
          >
            <div className="h-4 w-4 rounded-[0.28rem]" style={{ background: 'var(--primary)' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workbench</span>
            <span className="text-base font-extrabold text-[var(--text-primary)]">TaskHelm</span>
          </div>
        </Link>
        <span
          className="rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.1em]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.42)' }}
        >
          Beta
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="app-sidebar-section-label px-2">Navigate</span>
        <nav className="mt-1 flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} className="relative block">
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-hover)', boxShadow: 'var(--shadow-card)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span
                  className="relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  <span
                    className="inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-1 font-mono text-[0.68rem]"
                    style={{ background: active ? 'var(--accent-muted)' : 'rgba(255,255,255,0.36)', color: active ? 'var(--accent-ink)' : 'var(--text-muted)' }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.44)' }}>
        <div className="app-sidebar-section-label">Mode</div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Local-first projects, task tracking, and dev control in one workbench.
        </p>
      </div>

      {recentProjects.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <span className="app-sidebar-section-label px-2">Recent Projects</span>
          <div className="flex flex-col gap-1 overflow-auto pr-1">
            {recentProjects.map(p => (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
                style={{ borderColor: 'transparent', color: 'var(--text-secondary)' }}
              >
                <div className="truncate text-[var(--text-primary)]">{p.name}</div>
                <div className="truncate text-[0.72rem] text-[var(--text-muted)]">/projects/{p.slug}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('taskhelm:open-onboarding'))}
        className="app-sidebar-help-button"
        aria-label="Open TaskHelm guide"
      >
        <span className="app-sidebar-help-button-icon">?</span>
        <span>How TaskHelm works</span>
      </button>
    </aside>
  )
}
