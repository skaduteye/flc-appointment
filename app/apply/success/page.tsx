import Link from 'next/link'

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">
          ✓
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Submitted</h1>
          <p className="text-gray-500 mt-2">
            Thank you. Your pastoral candidate application has been received and will be reviewed
            by church leadership.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          Your application has been scored automatically. Results are confidential and will be
          communicated through official channels.
        </div>
        <Link
          href="/"
          className="inline-block mt-2 text-sm text-blue-700 hover:underline"
        >
          Return to home
        </Link>
      </div>
    </main>
  )
}
