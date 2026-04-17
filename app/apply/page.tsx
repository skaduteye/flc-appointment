'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { calculateScore } from '@/lib/scoring'
import {
  DEFAULT_OVERSIGHT_OPTIONS,
  DEFAULT_OVERSIGHT_AREAS,
  DEFAULT_SCORING_WEIGHTS,
} from '@/lib/settings'
import { isValidGhanaPhone } from '@/lib/sms'
import type { CandidateInput } from '@/lib/types'
import type { AppSettings } from '@/lib/settings'

const defaultValues: CandidateInput = {
  full_name: '',
  surname: '',
  date_of_birth: null,
  gender: null,
  oversight: null,
  oversight_area: null,
  phone_number: '',

  is_born_again: false,
  speaks_in_tongues: false,
  has_call_to_ministry: false,
  prays_regularly: false,
  pays_tithes_regularly: false,

  has_spiritual_character_problem: false,
  spiritual_character_detail: null,
  has_known_moral_problem: false,
  moral_problem_detail: null,
  is_known_thief: false,
  has_shown_disloyalty: false,

  years_of_membership: 0,
  volunteer_times: 0,
  volunteers_in_church_offices: false,
  years_fulltime_worker: 0,
  is_fulltime_ministry: false,
  is_missionary: false,
  is_missionary_wife: false,
  is_benmp: false,

  preaches_to_20plus: false,
  preaches_to_10_or_less: false,
  centers_planted: 0,

  camps_with_prophet: 0,
  camps_with_prophet_list: null,
  camps_with_bishops: 0,
  root_camps_attended: 0,

  has_tablet_with_books: false,
  has_hard_copies_books: false,
  has_tablet_with_bibles: false,
  has_hard_copies_bibles: false,
  has_audio_library_access: false,
  communicates_with_prophet: false,
  communicates_with_mothers: false,
  communicates_with_bishops: false,
  interest_in_church_activities: false,
}

const SECTIONS = [
  { label: 'Personal Info', cat: '' },
  { label: 'Category A', cat: 'Strong Christian Status' },
  { label: 'Category B', cat: 'Sweet Influence Status' },
  { label: 'Category C', cat: 'Loyalty Status' },
  { label: 'Category D', cat: 'Fruitfulness Status' },
  { label: 'Category E', cat: 'Servants Armed & Trained' },
  { label: 'Category G', cat: 'Pineapple Patch' },
  { label: 'Review', cat: 'Submit' },
]

function YesNo({
  label,
  value,
  onChange,
  warning,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  warning?: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 ${warning && value ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <p className="text-sm font-medium text-gray-800 mb-3">{label}</p>
      <div className="flex gap-3">
        {([true, false] as const).map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-colors ${
              value === opt
                ? opt
                  ? warning
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-blue-700 text-white border-blue-700'
                  : 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {warning && value && (
        <p className="mt-2 text-xs text-red-600 font-medium">
          ⚠ This response flags the candidate for disqualification review.
        </p>
      )}
    </div>
  )
}

function NumberInput({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <label className="text-sm font-medium text-gray-800 block mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <label className="text-sm font-medium text-gray-800 block mb-1">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
      />
    </div>
  )
}

export default function ApplyPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CandidateInput>(defaultValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<Pick<AppSettings, 'oversight_options' | 'oversight_areas' | 'score_threshold' | 'scoring_weights'>>({
    oversight_options: DEFAULT_OVERSIGHT_OPTIONS,
    oversight_areas: DEFAULT_OVERSIGHT_AREAS,
    score_threshold: 700,
    scoring_weights: DEFAULT_SCORING_WEIGHTS,
  })

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => setSettings(s))
      .catch(() => {})
  }, [])

  const set = <K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const { total, breakdown, isDisqualified } = calculateScore(form, settings.scoring_weights)
  const meetsThreshold = !isDisqualified && total >= settings.score_threshold

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Submission failed')
      }
      router.push('/apply/success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.full_name.trim()) return 'Please enter your given name(s)'
      if (!form.surname.trim()) return 'Please enter your surname'
      if (!form.gender) return 'Please select your gender'
      if (!form.oversight) return 'Please select your oversight'
      if (!form.oversight_area) return 'Please select your oversight area'
      if (!form.phone_number?.trim()) return 'Please enter your phone number'
      if (!isValidGhanaPhone(form.phone_number)) return 'Please enter a valid Ghana phone number (e.g. 0241234567)'
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-950 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">
            First Love Church — UO-FLC190
          </p>
          <h1 className="text-xl font-bold">Pastoral Appointment Application</h1>
          <div className="mt-4 flex gap-0.5">
            {SECTIONS.map((s, i) => (
              <div
                key={s.label}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i < step ? 'bg-green-400' : i === step ? 'bg-blue-400' : 'bg-blue-800'
                }`}
              />
            ))}
          </div>
          <p className="text-blue-300 text-xs mt-2">
            {SECTIONS[step].label}{SECTIONS[step].cat ? `: ${SECTIONS[step].cat}` : ''} — Step {step + 1} of {SECTIONS.length}
          </p>
        </div>
      </div>

      {/* Live score banner */}
      <div className={`px-4 py-2 text-center text-sm font-semibold ${
        isDisqualified ? 'bg-red-100 text-red-700' :
        meetsThreshold ? 'bg-green-50 text-green-700' :
        'bg-blue-50 text-blue-700'
      }`}>
        {isDisqualified
          ? '⚠ A disqualifying response is selected'
          : `Running score: ${total} / 1350 points${meetsThreshold ? ' ✓ Above threshold' : ` (${settings.score_threshold} needed)`}`}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Given Name(s) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">As appears on official documents</p>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First / middle names"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Surname(s) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">As appears on official documents</p>
                <input
                  type="text"
                  value={form.surname}
                  onChange={(e) => set('surname', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Surname"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth ?? ''}
                  onChange={(e) => set('date_of_birth', e.target.value || null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 mt-2">
                  {(['MALE', 'FEMALE'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set('gender', g)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                        form.gender === g
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Oversight <span className="text-red-500">*</span>
              </label>
              <select
                value={form.oversight ?? ''}
                onChange={(e) => set('oversight', e.target.value || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select your oversight…</option>
                {settings.oversight_options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Oversight Area <span className="text-red-500">*</span>
              </label>
              <select
                value={form.oversight_area ?? ''}
                onChange={(e) => set('oversight_area', e.target.value || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select your area…</option>
                {settings.oversight_areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Ghana number — you will receive an SMS confirmation with your score
              </p>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">
                  +233
                </span>
                <input
                  type="tel"
                  value={form.phone_number?.replace(/^(\+233|233)/, '0') ?? ''}
                  onChange={(e) => set('phone_number', e.target.value)}
                  placeholder="0241234567"
                  maxLength={10}
                  className="flex-1 rounded-r-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Category A */}
        {step === 1 && (
          <div className="space-y-4">
            <YesNo label="Are you born again?" value={form.is_born_again} onChange={(v) => set('is_born_again', v)} />
            <YesNo label="Do you speak in tongues?" value={form.speaks_in_tongues} onChange={(v) => set('speaks_in_tongues', v)} />
            <YesNo label="Do you believe you have a call to the ministry?" value={form.has_call_to_ministry} onChange={(v) => set('has_call_to_ministry', v)} />
            <YesNo label="Do you pray regularly? (Minimum of 1 hour a day)" value={form.prays_regularly} onChange={(v) => set('prays_regularly', v)} />
            <YesNo label="Do you pay tithes regularly?" value={form.pays_tithes_regularly} onChange={(v) => set('pays_tithes_regularly', v)} />
          </div>
        )}

        {/* Step 2: Category B */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              Please answer honestly. Responses are strictly confidential and reviewed by church leadership.
            </p>
            <YesNo
              label="Do you have any spiritual/character problem not ideal for pastoral calling? (e.g. borrowing from members, etc.)"
              value={form.has_spiritual_character_problem}
              onChange={(v) => set('has_spiritual_character_problem', v)}
              warning
            />
            {form.has_spiritual_character_problem && (
              <TextArea
                label="If Yes, list them below:"
                value={form.spiritual_character_detail ?? ''}
                onChange={(v) => set('spiritual_character_detail', v || null)}
                placeholder="Describe the issue(s)…"
              />
            )}
            <YesNo
              label="Do you have any known moral problem? (e.g. fornication, pornography, etc.)"
              value={form.has_known_moral_problem}
              onChange={(v) => set('has_known_moral_problem', v)}
              warning
            />
            {form.has_known_moral_problem && (
              <TextArea
                label="If Yes, list them below:"
                value={form.moral_problem_detail ?? ''}
                onChange={(v) => set('moral_problem_detail', v || null)}
                placeholder="Describe the issue(s)…"
              />
            )}
            <YesNo
              label="Are you a known thief?"
              value={form.is_known_thief}
              onChange={(v) => set('is_known_thief', v)}
              warning
            />
            <YesNo
              label="Have you shown traits of disloyalty? (e.g. association with Orangus, left serving position in another church, non-compliant with admin instructions, etc.)"
              value={form.has_shown_disloyalty}
              onChange={(v) => set('has_shown_disloyalty', v)}
              warning
            />
          </div>
        )}

        {/* Step 3: Category C */}
        {step === 3 && (
          <div className="space-y-4">
            <NumberInput
              label="Number of years of membership in UO"
              value={form.years_of_membership}
              onChange={(v) => set('years_of_membership', v)}
              hint="Previous memberships in UD count. Score: 3pts/year, max 10pts."
            />
            <NumberInput
              label="How many times have you volunteered at a special program? (GTWC, HJC, etc.)"
              value={form.volunteer_times}
              onChange={(v) => set('volunteer_times', v)}
              hint="Enter 0 if none. Score: 3pts/time, max 10pts."
            />
            <YesNo
              label="Have you volunteered in church offices or other activities on a lay basis?"
              value={form.volunteers_in_church_offices}
              onChange={(v) => set('volunteers_in_church_offices', v)}
            />
            <NumberInput
              label="Number of years as a full-time worker"
              value={form.years_fulltime_worker}
              onChange={(v) => set('years_fulltime_worker', v)}
              hint="Enter 0 if none. Score: 5pts/year, max 20pts."
            />
            <YesNo label="Are you in full-time ministry?" value={form.is_fulltime_ministry} onChange={(v) => set('is_fulltime_ministry', v)} />
            <YesNo label="Are you a missionary?" value={form.is_missionary} onChange={(v) => set('is_missionary', v)} />
            <YesNo label="Are you a missionary wife?" value={form.is_missionary_wife} onChange={(v) => set('is_missionary_wife', v)} />
            <YesNo label="Are you a BENMP?" value={form.is_benmp} onChange={(v) => set('is_benmp', v)} />
          </div>
        )}

        {/* Step 4: Category D */}
        {step === 4 && (
          <div className="space-y-4">
            <YesNo label="Do you preach to 20 or more members every week?" value={form.preaches_to_20plus} onChange={(v) => set('preaches_to_20plus', v)} />
            <YesNo label="Do you preach to 10 or less members every week?" value={form.preaches_to_10_or_less} onChange={(v) => set('preaches_to_10_or_less', v)} />
            <NumberInput
              label="Number of gathering services / centers / basontas / bacentas / fellowships planted"
              value={form.centers_planted}
              onChange={(v) => set('centers_planted', v)}
              hint="Score: 25pts/center, max 100pts."
            />
          </div>
        )}

        {/* Step 5: Category E */}
        {step === 5 && (
          <div className="space-y-4">
            <NumberInput
              label="Number of camps attended with Prophet"
              value={form.camps_with_prophet}
              onChange={(v) => set('camps_with_prophet', v)}
              hint="Score: 25pts/camp, max 100pts."
            />
            {form.camps_with_prophet > 0 && (
              <TextArea
                label="List camps with Prophet:"
                value={form.camps_with_prophet_list ?? ''}
                onChange={(v) => set('camps_with_prophet_list', v || null)}
                placeholder="e.g. Root Camp 2019, GTWC 2021…"
              />
            )}
            <NumberInput
              label="Number of camps attended with other Bishops"
              value={form.camps_with_bishops}
              onChange={(v) => set('camps_with_bishops', v)}
              hint="Score: 5pts/camp, max 20pts."
            />
            <NumberInput
              label="Number of root camps attended"
              value={form.root_camps_attended}
              onChange={(v) => set('root_camps_attended', v)}
              hint="Score: 5pts/camp, max 20pts."
            />
          </div>
        )}

        {/* Step 6: Category G */}
        {step === 6 && (
          <div className="space-y-4">
            <YesNo label="Do you possess a Tablet/Device with all Bishop Dag's books (100 books)?" value={form.has_tablet_with_books} onChange={(v) => set('has_tablet_with_books', v)} />
            <YesNo label="Do you possess hard copies of all Bishop Dag's books (100 books)?" value={form.has_hard_copies_books} onChange={(v) => set('has_hard_copies_books', v)} />
            <YesNo label="Do you possess a Tablet with Bibles and Bible Study Aids?" value={form.has_tablet_with_bibles} onChange={(v) => set('has_tablet_with_bibles', v)} />
            <YesNo label="Do you possess hard copies of Bibles and Bible Study Aids?" value={form.has_hard_copies_bibles} onChange={(v) => set('has_hard_copies_bibles', v)} />
            <YesNo
              label="Do you have downloaded or ready access to the UO Audio Library? (Macheneh, Poimano, Bosko, Euaggelizo, First Love Music)"
              value={form.has_audio_library_access}
              onChange={(v) => set('has_audio_library_access', v)}
            />
            <YesNo label="Do you have communication with Prophet regularly?" value={form.communicates_with_prophet} onChange={(v) => set('communicates_with_prophet', v)} />
            <YesNo label="Do you have communication with Mothers regularly?" value={form.communicates_with_mothers} onChange={(v) => set('communicates_with_mothers', v)} />
            <YesNo label="Do you have communication with Other Bishops?" value={form.communicates_with_bishops} onChange={(v) => set('communicates_with_bishops', v)} />
            <YesNo
              label="Have you demonstrated interest in other church-related activities? (Buildings, Admin, Outreach organisation, etc.)"
              value={form.interest_in_church_activities}
              onChange={(v) => set('interest_in_church_activities', v)}
            />
          </div>
        )}

        {/* Step 7: Review */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 text-lg">Review Your Application</h2>

            {/* Identity summary */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm space-y-1">
              <p className="font-semibold text-gray-800">{form.full_name} {form.surname}</p>
              <p className="text-gray-500">{form.gender} · {form.oversight} · {form.oversight_area}</p>
            </div>

            {/* Score card */}
            <div className={`rounded-xl border-2 p-6 text-center ${
              isDisqualified ? 'border-red-300 bg-red-50' :
              meetsThreshold ? 'border-green-300 bg-green-50' :
              'border-yellow-300 bg-yellow-50'
            }`}>
              {isDisqualified ? (
                <>
                  <div className="text-4xl mb-2">⚠</div>
                  <p className="text-red-700 font-bold text-lg">Disqualifying Response Detected</p>
                  <p className="text-red-600 text-sm mt-1">Application will be submitted and flagged for review.</p>
                </>
              ) : (
                <>
                  <div className={`text-5xl font-bold ${meetsThreshold ? 'text-green-700' : 'text-yellow-700'}`}>{total}</div>
                  <p className="text-gray-600 text-sm mt-1">out of {1350} maximum points</p>
                  <p className={`font-semibold mt-2 text-sm ${meetsThreshold ? 'text-green-700' : 'text-yellow-700'}`}>
                    {meetsThreshold ? `✓ Meets the ${settings.score_threshold}-point threshold for consideration` : `${settings.score_threshold - total} more points needed for consideration`}
                  </p>
                </>
              )}
            </div>

            {/* Breakdown */}
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
              {[
                { label: 'Cat A — Strong Christian Status', value: breakdown.spiritual },
                { label: 'Cat B — Sweet Influence (Disqualifiers)', value: breakdown.disqualifiers },
                { label: 'Cat C — Loyalty Status', value: breakdown.membership },
                { label: 'Cat D — Fruitfulness Status', value: breakdown.ministry },
                { label: 'Cat E — Servants Armed & Trained', value: breakdown.equipped },
                { label: 'Cat G — Pineapple Patch', value: breakdown.pineapple },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className={`font-semibold ${value < 0 ? 'text-red-600' : value > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                    {value > 0 ? '+' : ''}{value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3 text-sm font-bold bg-gray-50">
                <span>Total</span>
                <span className={isDisqualified ? 'text-red-600' : 'text-gray-900'}>{total}</span>
              </div>
            </div>

            <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <strong>Declaration:</strong> I confirm that all responses above are truthful and accurate to
              the best of my knowledge. I understand that false declarations may affect my candidacy.
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => { setError(''); setStep((s) => s - 1) }}
            disabled={step === 0}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>

          {step < SECTIONS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                const validationError = validateStep()
                if (validationError) { setError(validationError); return }
                setError('')
                setStep((s) => s + 1)
              }}
              className="px-6 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2.5 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  )
}
