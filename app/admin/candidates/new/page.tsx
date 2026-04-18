'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CandidateStatus } from '@/lib/types'
import { DEFAULT_OVERSIGHT_AREAS, DEFAULT_OVERSIGHT_OPTIONS } from '@/lib/types'

const STATUS_OPTIONS: CandidateStatus[] = ['pending', 'under_review', 'approved', 'rejected']

export default function NewCandidatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [surname, setSurname] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [oversight, setOversight] = useState('')
  const [oversightArea, setOversightArea] = useState('')
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE'>('')
  const [status, setStatus] = useState<CandidateStatus>('pending')
  const [totalScore, setTotalScore] = useState(0)
  const [notes, setNotes] = useState('')

  const [oversightOptions, setOversightOptions] = useState<string[]>(DEFAULT_OVERSIGHT_OPTIONS)
  const [oversightAreas, setOversightAreas] = useState<string[]>(DEFAULT_OVERSIGHT_AREAS)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        if (Array.isArray(s.oversight_options) && s.oversight_options.length > 0) {
          setOversightOptions(s.oversight_options)
        }
        if (Array.isArray(s.oversight_areas) && s.oversight_areas.length > 0) {
          setOversightAreas(s.oversight_areas)
        }
      })
      .catch(() => {})
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/candidates/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          surname,
          phone_number: phoneNumber || null,
          oversight: oversight || null,
          oversight_area: oversightArea || null,
          gender: gender || null,
          status,
          total_score: totalScore,
          admin_notes: notes || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Server error: ${res.status}`)
      }

      const json = await res.json()
      router.push(`/admin/candidates/${json.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create candidate')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Candidate Result</h1>
          <p className="text-sm text-gray-500 mt-1">Create a candidate record manually from admin.</p>
        </div>
        <Link href="/admin/candidates" className="text-sm text-blue-700 hover:underline">
          ← Back to candidates
        </Link>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Given name(s)</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0241234567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as '' | 'MALE' | 'FEMALE')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Not specified</option>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oversight leader</label>
            <select
              value={oversight}
              onChange={(e) => setOversight(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Not specified</option>
              {oversightOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Oversight area</label>
            <select
              value={oversightArea}
              onChange={(e) => setOversightArea(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Not specified</option>
              {oversightAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CandidateStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total score</label>
            <input
              type="number"
              min={0}
              value={totalScore}
              onChange={(e) => setTotalScore(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
            placeholder="Optional internal notes"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/admin/candidates"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Candidate'}
          </button>
        </div>
      </form>
    </div>
  )
}
