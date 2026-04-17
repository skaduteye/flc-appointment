'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { OVERSIGHT_OPTIONS, OVERSIGHT_AREA_OPTIONS } from '@/lib/types'
import { isValidGhanaPhone } from '@/lib/sms'
import type { CandidateInput } from '@/lib/types'

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

  photo_url: null,
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

function PhotoUpload({ value, onChange, firstName, surname }: {
  value: string | null
  onChange: (url: string) => void
  firstName: string
  surname: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(value)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleFile(file: File) {
    setUploadError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Only JPEG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Photo must be smaller than 5 MB.')
      return
    }
    setUploading(true)
    try {
      const name = `${firstName} ${surname}`.trim()
      const res = await fetch(`/api/upload/photo?type=${encodeURIComponent(file.type)}&size=${file.size}&name=${encodeURIComponent(name)}`)
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to get upload URL')
      }
      const { uploadUrl, key } = await res.json()
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!put.ok) throw new Error('Upload to storage failed')
      setPreview(URL.createObjectURL(file))
      onChange(key)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Passport Photo <span className="text-red-500">*</span>
      </label>

      {/* Example + requirements */}
      <div className="flex gap-4 items-start rounded-xl border border-blue-100 bg-blue-50 p-3">
        <img
          src="/passport-photo-example.svg"
          alt="Example passport photo"
          className="w-16 h-20 rounded border border-gray-200 shadow-sm shrink-0 bg-white"
        />
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-semibold text-sm">Photo requirements</p>
          <ul className="space-y-0.5 list-none">
            <li>✓ Plain <strong>white background</strong></li>
            <li>✓ Full face clearly visible, looking forward</li>
            <li>✓ No sunglasses or headwear (unless religious)</li>
            <li>✓ Recent photo</li>
            <li>✓ JPEG, PNG or WebP · max 5 MB</li>
          </ul>
        </div>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {preview ? (
          <img src={preview} alt="Passport photo preview" className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm" />
        ) : (
          <div className="w-32 h-32 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
        <span className="text-sm text-blue-700 font-medium">
          {uploading ? 'Uploading…' : preview ? 'Change photo' : 'Choose or drop photo'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {uploadError && <p className="text-red-600 text-xs">{uploadError}</p>}
    </div>
  )
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
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

  const set = <K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

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
      if (!form.photo_url) return 'Please upload your passport photo'
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
                {OVERSIGHT_OPTIONS.map((o) => (
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
                {OVERSIGHT_AREA_OPTIONS.map((a) => (
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

            <PhotoUpload
              value={form.photo_url}
              onChange={(url) => set('photo_url', url)}
              firstName={form.full_name}
              surname={form.surname}
            />
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
            />
            <YesNo
              label="Have you shown traits of disloyalty? (e.g. association with Orangus, left serving position in another church, non-compliant with admin instructions, etc.)"
              value={form.has_shown_disloyalty}
              onChange={(v) => set('has_shown_disloyalty', v)}
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

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
              <p className="text-blue-800 font-semibold">Your application is ready to submit.</p>
              <p className="text-blue-600 text-sm mt-1">Please review your details above before confirming.</p>
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
