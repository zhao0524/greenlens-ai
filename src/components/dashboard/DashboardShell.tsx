'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  ClipboardList,
  FileText,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Leaf,
  LineChart,
} from 'lucide-react'

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/models', label: 'Model Efficiency', icon: Bot },
      { href: '/dashboard/footprint', label: 'Carbon & Water', icon: Leaf },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { href: '/dashboard/licenses', label: 'Licenses', icon: KeyRound },
      { href: '/dashboard/incentives', label: 'Incentives', icon: Landmark },
      { href: '/dashboard/benchmark', label: 'Benchmark', icon: LineChart },
    ],
  },
  {
    label: 'ACTIONS',
    items: [
      { href: '/dashboard/decisions', label: 'Decisions', icon: ClipboardList },
      { href: '/dashboard/esg', label: 'ESG Export', icon: FileText },
    ],
  },
]

interface DashboardShellProps {
  companyName: string
  children: ReactNode
  footerActions?: ReactNode
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function DashboardShell({ companyName, children, footerActions }: DashboardShellProps) {
  const pathname = usePathname()
  const initials = getInitials(companyName) || 'GL'

  return (
    <div className="min-h-screen bg-[#fbfcfb]">
      <div className="flex min-h-screen gap-2 p-2 lg:gap-3 lg:p-3">
        <aside
          className="hidden w-[220px] shrink-0 rounded-[22px] border border-[#315e4e] bg-[linear-gradient(180deg,#2d5d4c_0%,#255041_100%)] px-3 py-5 text-white shadow-[0_18px_60px_rgba(37,80,65,0.24)] lg:flex lg:flex-col"
        >
          <div className="flex items-center gap-3 pb-5 pl-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7bdc93] text-[#234638] shadow-lg">
              <Leaf className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-semibold leading-none text-white">EMS Control</p>
              <p className="text-[10px] leading-none text-white/75">Energy Management</p>
            </div>
          </div>

          <nav className="flex-1 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.href === '/dashboard'
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#7bdc93] text-[#1c3d2e] shadow-[0_2px_8px_rgba(123,220,147,0.35)]'
                            : 'text-white/75 hover:bg-white/8 hover:text-white'
                        }`}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 rounded-[12px] bg-white/5 px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7bdc93] text-[11px] font-semibold text-[#1c3d2e] ring-1 ring-white/20">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold leading-4 text-white">{companyName}</p>
                <p className="text-[10px] text-white/65">AI Workspace</p>
              </div>
            </div>
            {footerActions && <div className="mt-2 space-y-1.5">{footerActions}</div>}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-2rem)] overflow-hidden rounded-[32px] border border-[#eef2ef] bg-white">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
