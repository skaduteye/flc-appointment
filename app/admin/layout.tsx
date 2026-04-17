import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers()
  const pathname = headerStore.get('x-pathname') ?? ''

  // Login page is inside this layout but must not be guarded
  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login')

  if (!isLoginPage) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only in Server Components — middleware handles writes
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/admin/login')
    }
  }

  // Don't render the nav chrome on the login page
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
