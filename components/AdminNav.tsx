'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/candidates', label: 'Candidates' },
  { href: '/admin/broadcast', label: 'Broadcast SMS' },
  { href: '/admin/sync', label: 'Sync' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav className="bg-blue-950 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-sm">FLC Admin</span>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'text-white font-semibold'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="text-blue-300 text-sm hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
