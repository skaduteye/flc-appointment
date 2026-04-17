import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-blue-950 text-white px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-3">
          <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest">First Love Church</p>
          <h1 className="text-4xl font-bold leading-tight">
            Pastoral Appointment<br />Points Evaluation Portal
          </h1>
          <p className="text-blue-200 text-lg">
            Complete your pastoral candidate application. Responses are scored automatically
            and reviewed by church leadership.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/apply"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-white text-blue-900 font-semibold hover:bg-blue-50 transition-colors text-lg shadow-lg"
          >
            Start Application
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-blue-400 text-blue-100 font-semibold hover:bg-blue-800 transition-colors text-lg"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </main>
  )
}
