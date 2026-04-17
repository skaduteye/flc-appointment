import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-blue-950 text-white">
      {/* Top bar */}
      <div className="flex justify-end px-6 py-4">
        <Link
          href="/admin/login"
          className="text-blue-300 text-sm font-medium hover:text-white transition-colors"
        >
          Admin Login
        </Link>
      </div>

      {/* Centre content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-3">
            <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest">First Love Church</p>
            <h1 className="text-4xl font-bold leading-tight">
              Pastoral Appointment<br />Points Evaluation Portal
            </h1>
          </div>

          <Link
            href="/apply"
            className="inline-flex items-center justify-center px-10 py-4 rounded-xl bg-white text-blue-900 font-bold hover:bg-blue-50 transition-colors text-lg shadow-lg"
          >
            Start Application
          </Link>
        </div>
      </div>
    </main>
  )
}
