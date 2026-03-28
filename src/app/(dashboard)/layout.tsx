import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountActions from '@/components/dashboard/AccountActions'

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/models', label: 'Model Efficiency' },
  { href: '/dashboard/footprint', label: 'Carbon & Water' },
  { href: '/dashboard/licenses', label: 'Licenses' },
  { href: '/dashboard/incentives', label: 'Incentives' },
  { href: '/dashboard/benchmark', label: 'Benchmark' },
  { href: '/dashboard/decisions', label: 'Decisions' },
  { href: '/dashboard/esg', label: 'ESG Export' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase.from('companies').select('id, name')
    .eq('supabase_user_id', user.id).single()
  if (!company) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <span className="text-white font-bold text-lg">GreenLens</span>
          <span className="text-green-400 font-bold text-lg"> AI</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-3">
          <div>
            <p className="text-gray-500 text-xs mb-1 truncate">{company.name}</p>
            <Link href="/onboarding/connect" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
              Manage integrations
            </Link>
          </div>
          <AccountActions />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
