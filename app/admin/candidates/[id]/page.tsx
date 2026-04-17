'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Candidate, CandidateStatus } from '@/lib/types'
import { calculateScore } from '@/lib/scoring'
import { statusColor, formatDate } from '@/lib/utils'

const STATUS_OPTIONS: CandidateStatus[] = ['pending', 'under_review', 'approved', 'rejected']

function Row({ label, value }: { label: string; value: string | number | boolean | null }) {
  const display =
    typeof value === 'boolean'
      ? value ? 'Yes' : 'No'
      : value === null || value === undefined
      ? '—'
      : String(value)
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 max-w-xs">{label}</span>
      <span className={`font-medium ${typeof value === 'boolean' && value ? 'text-blue-700' : 'text-gray-900'}`}>
        {display}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CandidateStatus>('pending')
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/candidates/${id}`)
      .then((r) => r.json())
      .then((c) => {
        setCandidate(c)
        setNotes(c.admin_notes ?? '')
        setStatus(c.status)
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: notes }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${candidate?.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
    router.push('/admin/candidates')
  }

  if (loading) return <div className="text-gray-500 text-sm">Loading…</div>
  if (!candidate) return <div className="text-gray-500 text-sm">Candidate not found.</div>

  const { breakdown, isDisqualified } = calculateScore(candidate)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="text-blue-700 text-sm hover:underline mb-2 block">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{candidate.full_name}</h1>
          <p className="text-gray-400 text-xs mt-1">Submitted {formatDate(candidate.created_at)}</p>
        </div>
        <div className={`text-center rounded-xl px-6 py-3 border-2 ${isDisqualified ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`text-4xl font-bold ${isDisqualified ? 'text-red-600' : 'text-blue-700'}`}>
            {candidate.total_score}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Total Score</div>
          {isDisqualified && <div className="text-xs text-red-600 font-semibold mt-1">DISQUALIFIED</div>}
        </div>
      </div>

      {/* Score breakdown */}
      <Section title="Score Breakdown (UO-FLC190)">
        {[
          { label: 'Cat A — Strong Christian Status', value: breakdown.spiritual, max: 130 },
          { label: 'Cat B — Sweet Influence (Disqualifiers)', value: breakdown.disqualifiers, max: 0 },
          { label: 'Cat C — Loyalty Status', value: breakdown.membership, max: 600 },
          { label: 'Cat D — Fruitfulness Status', value: breakdown.ministry, max: 400 },
          { label: 'Cat E — Servants Armed & Trained', value: breakdown.equipped, max: 140 },
          { label: 'Cat G — Pineapple Patch', value: breakdown.pineapple, max: 480 },
        ].map(({ label, value, max }) => (
          <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 text-sm">
            <span className="text-gray-600">{label}</span>
            <span className={`font-semibold ${value < 0 ? 'text-red-600' : value > 0 ? 'text-green-700' : 'text-gray-400'}`}>
              {value > 0 ? '+' : ''}{value}{max > 0 ? ` / ${max}` : ''}
            </span>
          </div>
        ))}
        <div className="flex justify-between items-center py-2.5 text-sm font-bold bg-gray-50 -mx-6 px-6">
          <span>Total</span>
          <span className={candidate.total_score < 700 ? 'text-yellow-700' : 'text-green-700'}>
            {candidate.total_score} / 1350
            {candidate.total_score >= 700 ? ' ✓' : ' (700 needed)'}
          </span>
        </div>
      </Section>

      {/* Personal Info */}
      <Section title="Personal Information">
        <Row label="Given name(s)" value={candidate.full_name} />
        <Row label="Surname(s)" value={candidate.surname} />
        <Row label="Date of birth" value={candidate.date_of_birth} />
        <Row label="Gender" value={candidate.gender} />
        <Row label="Phone number" value={candidate.phone_number} />
        <Row label="Oversight" value={candidate.oversight} />
        <Row label="Oversight area" value={candidate.oversight_area} />
        <Row label="SMS sent at" value={candidate.sms_sent_at ? new Date(candidate.sms_sent_at).toLocaleString() : null} />
      </Section>

      {/* Category A */}
      <Section title="Category A — Strong Christian Status">
        <Row label="Born again?" value={candidate.is_born_again} />
        <Row label="Speaks in tongues?" value={candidate.speaks_in_tongues} />
        <Row label="Believes has call to ministry?" value={candidate.has_call_to_ministry} />
        <Row label="Prays regularly (≥1 hr/day)?" value={candidate.prays_regularly} />
        <Row label="Pays tithes regularly?" value={candidate.pays_tithes_regularly} />
      </Section>

      {/* Category B */}
      <Section title="Category B — Sweet Influence Status (Disqualifiers)">
        <Row label="⚠ Has spiritual/character problem?" value={candidate.has_spiritual_character_problem} />
        {candidate.spiritual_character_detail && (
          <Row label="  Details" value={candidate.spiritual_character_detail} />
        )}
        <Row label="⚠ Has known moral problem?" value={candidate.has_known_moral_problem} />
        {candidate.moral_problem_detail && (
          <Row label="  Details" value={candidate.moral_problem_detail} />
        )}
        <Row label="⚠ Is a known thief?" value={candidate.is_known_thief} />
        <Row label="⚠ Has shown traits of disloyalty?" value={candidate.has_shown_disloyalty} />
      </Section>

      {/* Category C */}
      <Section title="Category C — Loyalty Status">
        <Row label="Years of UO membership" value={candidate.years_of_membership} />
        <Row label="Times volunteered at special programs" value={candidate.volunteer_times} />
        <Row label="Volunteers in church offices (lay basis)?" value={candidate.volunteers_in_church_offices} />
        <Row label="Years as full-time worker" value={candidate.years_fulltime_worker} />
        <Row label="In full-time ministry?" value={candidate.is_fulltime_ministry} />
        <Row label="Is a missionary?" value={candidate.is_missionary} />
        <Row label="Is a missionary wife?" value={candidate.is_missionary_wife} />
        <Row label="Is a BENMP?" value={candidate.is_benmp} />
      </Section>

      {/* Category D */}
      <Section title="Category D — Fruitfulness Status">
        <Row label="Preaches to 20+ members/week?" value={candidate.preaches_to_20plus} />
        <Row label="Preaches to 10 or less members/week?" value={candidate.preaches_to_10_or_less} />
        <Row label="Centers / gatherings / basontas planted" value={candidate.centers_planted} />
      </Section>

      {/* Category E */}
      <Section title="Category E — Servants Armed and Trained">
        <Row label="Camps attended with Prophet" value={candidate.camps_with_prophet} />
        {candidate.camps_with_prophet_list && (
          <Row label="  List of camps" value={candidate.camps_with_prophet_list} />
        )}
        <Row label="Camps attended with other Bishops" value={candidate.camps_with_bishops} />
        <Row label="Root camps attended" value={candidate.root_camps_attended} />
      </Section>

      {/* Category G */}
      <Section title="Category G — Pineapple Patch">
        <Row label="Tablet/device with all Bishop Dag's books?" value={candidate.has_tablet_with_books} />
        <Row label="Hard copies of all Bishop Dag's books?" value={candidate.has_hard_copies_books} />
        <Row label="Tablet with Bibles & Bible Study Aids?" value={candidate.has_tablet_with_bibles} />
        <Row label="Hard copies of Bibles & Bible Study Aids?" value={candidate.has_hard_copies_bibles} />
        <Row label="UO Audio Library access?" value={candidate.has_audio_library_access} />
        <Row label="Communicates with Prophet regularly?" value={candidate.communicates_with_prophet} />
        <Row label="Communicates with Mothers regularly?" value={candidate.communicates_with_mothers} />
        <Row label="Communicates with Other Bishops?" value={candidate.communicates_with_bishops} />
        <Row label="Interest in other church activities?" value={candidate.interest_in_church_activities} />
      </Section>

      {/* Admin panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Admin Actions</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CandidateStatus)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Internal notes (not visible to candidate)…"
          />
        </div>
        <div className="flex gap-3 justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 text-sm hover:text-red-800 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete candidate'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
