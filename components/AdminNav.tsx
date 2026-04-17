'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/candidates', label: 'Candidates' },
  { href: '/admin/broadcast', label: 'Broadcast SMS' },
  { href: '/admin/sync', label: 'Import' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav className="bg-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-sm">FLC Admin</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors ${
                pathname.startsWith(href) ? 'text-white font-semibold' : 'text-blue-300 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          <button onClick={handleLogout} className="text-blue-300 text-sm hover:text-white transition-colors">
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden flex flex-col gap-1.5 p-1"
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-0.5 bg-white transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-blue-800 px-4 py-3 space-y-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block py-2 text-sm transition-colors ${
                pathname.startsWith(href) ? 'text-white font-semibold' : 'text-blue-300'
              }`}
            >
              {label}
            </Link>
          ))}
          <button onClick={handleLogout} className="block py-2 text-blue-300 text-sm w-full text-left">
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

