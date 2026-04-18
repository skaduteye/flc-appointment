'use client'

import { useEffect, useState } from 'react'
import type { CandidateStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: CandidateStatus | 'all'; label: string; description: string }[] = [
  { value: 'all', label: 'All Candidates', description: 'Everyone who submitted an application' },
  { value: 'under_review', label: 'Under Review', description: 'Candidates currently being reviewed' },
  { value: 'approved', label: 'Approved', description: 'Successfully appointed candidates' },
  { value: 'rejected', label: 'Rejected / Not Qualified', description: 'Candidates who did not qualify' },
  { value: 'pending', label: 'Pending', description: 'Not yet auto-processed' },
]

const SMS_LIMIT = 160
const MAX_CHARS = 918

export default function BroadcastPage() {
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'all'>('all')
  const [message, setMessage] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; creditsUsed: number; total: number; warnings?: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [candidateCount, setCandidateCount] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  // Fetch candidate count for selected filter
  useEffect(() => {
    setConfirmed(false)
    const params = new URLSearchParams({ limit: '1' })
    if (statusFilter !== 'all') params.set('status', statusFilter)
    fetch(`/api/candidates?${params}`)
      .then((r) => r.json())
      .then((d) => setCandidateCount(d.count ?? 0))
      .catch(() => {})
  }, [statusFilter])

  const parts = Math.ceil(message.length / SMS_LIMIT) || 1
  const creditsNeeded = (candidateCount ?? 0) * parts
  const balance = null // balance checks removed

  async function handleSend() {
    setSending(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/sms/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          statusFilter,
          campaignName: campaignName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Broadcast failed')
      setResult(data)
      if (data.warnings?.length) {
        setError(`Sent with warnings: ${data.warnings.join('; ')}`)
      }
      setConfirmed(false)
      setMessage('')
      setCampaignName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broadcast failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broadcast SMS</h1>
        <p className="text-gray-500 text-sm mt-1">
          Send a custom message to a group of candidates via FlashSMS.
        </p>
      </div>



      {/* Recipient group */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Recipients</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATUS_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                statusFilter === value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`text-sm font-semibold ${statusFilter === value ? 'text-blue-700' : 'text-gray-800'}`}>
                {label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{description}</div>
            </button>
          ))}
        </div>
        {candidateCount !== null && (
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">{candidateCount}</strong> candidate{candidateCount !== 1 ? 's' : ''} in this group
            {candidateCount > 0 && <span className="text-gray-400"> · {parts} SMS part{parts > 1 ? 's' : ''} each · <strong>{creditsNeeded} credits</strong> total</span>}
          </p>
        )}
      </div>

      {/* Message composer */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Message</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name <span className="text-gray-400">(optional)</span></label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Interview Reminder"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message text <span className="text-red-500">*</span></label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setConfirmed(false) }}
            placeholder="Type your message here…"
            maxLength={MAX_CHARS}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{message.length} / {MAX_CHARS} chars</span>
            <span>{parts} SMS part{parts > 1 ? 's' : ''} per recipient</span>
          </div>
        </div>

        {/* Preview */}
        {message.trim() && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Preview</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
          </div>
        )}
      </div>

      {/* Confirmation + send */}
      {message.trim() && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          {candidateCount !== null && candidateCount > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <strong>You are about to send {parts} SMS{parts > 1 ? ' parts' : ''} to {candidateCount} candidate{candidateCount !== 1 ? 's' : ''}.</strong>
              {' '}This will use <strong>{creditsNeeded} credits</strong> and cannot be undone.
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
              No candidates in this group yet.
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span className="text-sm text-gray-700">
              I confirm I want to send this message to the selected group.
            </span>
          </label>

          <button
            type="button"
            onClick={handleSend}
            disabled={!confirmed || sending || !message.trim() || !candidateCount}
            className="w-full py-3 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending…' : `Send to ${candidateCount ?? '…'} candidate${candidateCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-1">
          <p className="font-semibold text-green-800">✓ Broadcast complete</p>
          <p className="text-sm text-green-700">
            Sent to <strong>{result.sent}</strong> recipient{result.sent !== 1 ? 's' : ''} · {result.creditsUsed} credits used
          </p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  )
}
