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

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/models', label: 'Model Efficiency', icon: Bot },
  { href: '/dashboard/footprint', label: 'Carbon & Water', icon: Leaf },
  { href: '/dashboard/licenses', label: 'Licenses', icon: KeyRound },
  { href: '/dashboard/incentives', label: 'Incentives', icon: Landmark },
  { href: '/dashboard/benchmark', label: 'Benchmark', icon: LineChart },
  { href: '/dashboard/decisions', label: 'Decisions', icon: ClipboardList },
  { href: '/dashboard/esg', label: 'ESG Export', icon: FileText },
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
          className="hidden w-[104px] shrink-0 rounded-[22px] border border-[#315e4e] bg-[linear-gradient(180deg,#2d5d4c_0%,#255041_100%)] px-3 py-4 text-white shadow-[0_18px_60px_rgba(37,80,65,0.24)] lg:flex lg:flex-col"
        >
          <div className="flex flex-col items-center gap-3 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7bdc93] text-[#234638] shadow-lg">
              <Leaf className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-semibold leading-4 text-white">EMS Control</p>
              <p className="text-[9px] leading-4 text-white/55">Energy Management</p>
            </div>
          </div>

          <nav className="flex-1 pt-3">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex min-h-[52px] flex-col items-center justify-center rounded-[14px] px-2 py-2 text-[10px] font-medium transition-all ${
                      isActive
                        ? 'bg-[#7bdc93] text-[#24473a]'
                        : 'text-white/78 hover:bg-white/8 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    <Icon className="mb-1 h-4 w-4" strokeWidth={2} />
                    <span className="line-clamp-2 text-center leading-3">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="mt-auto pt-4">
            <div className="space-y-3">
              <div className="text-center">
                <p className="truncate text-[10px] font-medium text-white">{companyName}</p>
                <p className="text-[9px] text-white/55">AI Workspace</p>
            </div>
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#7bdc93] text-[11px] font-semibold text-[#24473a]">
                {initials}
              </div>
              {footerActions && <div className="space-y-2 text-[10px]">{footerActions}</div>}
            </div>
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
