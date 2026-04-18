'use client'

import { useEffect, useState } from 'react'
import type { AppSettings, ScoringWeights } from '@/lib/settings'
import { DEFAULT_SCORING_WEIGHTS } from '@/lib/settings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [newItem, setNewItem] = useState('')

  function add() {
    const v = newItem.trim()
    if (!v || items.includes(v)) return
    onChange([...items, v])
    setNewItem('')
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  function move(i: number, dir: -1 | 1) {
    const arr = [...items]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange(arr)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-gray-800">{item}</span>
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1"
              title="Move up"
            >▲</button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1"
              title="Move down"
            >▼</button>
            <button
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600 text-xs px-1"
              title="Remove"
            >✕</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={add}
          className="px-4 py-2 bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-800 transition-colors"
        >Add</button>
      </div>
    </div>
  )
}

function WeightInput({
  label,
  field,
  weights,
  onChange,
}: {
  label: string
  field: keyof ScoringWeights
  weights: ScoringWeights
  onChange: (field: keyof ScoringWeights, val: number) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-sm text-gray-700 flex-1 min-w-0">{label}</label>
      <input
        type="number"
        value={weights[field]}
        onChange={(e) => onChange(field, Number(e.target.value))}
        className="w-24 shrink-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function RateCapRow({
  label,
  rateField,
  capField,
  weights,
  onChange,
}: {
  label: string
  rateField: keyof ScoringWeights
  capField: keyof ScoringWeights
  weights: ScoringWeights
  onChange: (field: keyof ScoringWeights, val: number) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-sm text-gray-700 flex-1 min-w-0">{label}</label>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">×</span>
          <input
            type="number"
            value={weights[rateField]}
            onChange={(e) => onChange(rateField, Number(e.target.value))}
            className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Points per unit"
          />
        </div>
        <span className="text-xs text-gray-400">cap</span>
        <input
          type="number"
          value={weights[capField]}
          onChange={(e) => onChange(capField, Number(e.target.value))}
          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Maximum points"
        />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`)
        return r.json()
      })
      .then(setSettings)
      .catch((err) => console.error('Failed to load settings:', err))
  }, [])

  async function save(section: string, patch: Partial<AppSettings>) {
    setSaving(section)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Save failed')
      const updated = await res.json()
      setSettings(updated)
      setSavedMsg((m) => ({ ...m, [section]: 'Saved!' }))
      setTimeout(() => setSavedMsg((m) => ({ ...m, [section]: '' })), 3000)
    } catch {
      setSavedMsg((m) => ({ ...m, [section]: 'Error saving' }))
    } finally {
      setSaving(null)
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Loading settings…
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage form options, scoring weights, and system configuration.
        </p>
      </div>

      {/* ── Oversight Personnel ── */}
      <Section
        title="Oversight Personnel"
        description="Names that appear in the oversight dropdown on the application form."
        onSave={() => save('oversight', { oversight_options: settings.oversight_options })}
        saving={saving === 'oversight'}
        savedMsg={savedMsg.oversight}
      >
        <ListEditor
          label="Oversight names"
          items={settings.oversight_options}
          onChange={(v) => setSettings({ ...settings, oversight_options: v })}
        />
      </Section>

      {/* ── Oversight Areas ── */}
      <Section
        title="Oversight Areas"
        description="Area options available in the application form."
        onSave={() => save('areas', { oversight_areas: settings.oversight_areas })}
        saving={saving === 'areas'}
        savedMsg={savedMsg.areas}
      >
        <ListEditor
          label="Oversight areas"
          items={settings.oversight_areas}
          onChange={(v) => setSettings({ ...settings, oversight_areas: v })}
        />
      </Section>

      {/* ── Score Threshold ── */}
      <Section
        title="Score Threshold"
        description="Candidates scoring at or above this value are automatically moved to Under Review."
        onSave={() => save('threshold', { score_threshold: settings.score_threshold })}
        saving={saving === 'threshold'}
        savedMsg={savedMsg.threshold}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-gray-700 flex-1 min-w-0">Minimum score for Under Review</label>
          <input
            type="number"
            min={0}
            value={settings.score_threshold}
            onChange={(e) =>
              setSettings({ ...settings, score_threshold: Number(e.target.value) })
            }
            className="w-32 shrink-0 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Section>

      {/* ── Admin Phone ── */}
      <Section
        title="Admin Alert Phone"
        description="Receives an SMS alert whenever a new candidate submits an application."
        onSave={() => save('adminphone', { admin_phone: settings.admin_phone })}
        saving={saving === 'adminphone'}
        savedMsg={savedMsg.adminphone}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm text-gray-700 flex-1 min-w-0">Phone number (Ghana format, e.g. 0241234567)</label>
          <input
            type="tel"
            value={settings.admin_phone ?? ''}
            placeholder="0241234567"
            onChange={(e) =>
              setSettings({ ...settings, admin_phone: e.target.value || null })
            }
            className="w-40 shrink-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Section>

      {/* ── Scoring Weights ── */}
      <Section
        title="Scoring Weights"
        description="Point values for each criterion. Numeric fields show × (rate per unit) and a cap (maximum points)."
        onSave={() => save('weights', { scoring_weights: settings.scoring_weights })}
        saving={saving === 'weights'}
        savedMsg={savedMsg.weights}
        extra={
          <button
            onClick={() =>
              setSettings({ ...settings, scoring_weights: DEFAULT_SCORING_WEIGHTS })
            }
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Restore defaults
          </button>
        }
      >
        <WeightsEditor
          weights={settings.scoring_weights}
          onChange={(field, val) =>
            setSettings({
              ...settings,
              scoring_weights: { ...settings.scoring_weights, [field]: val },
            })
          }
        />
      </Section>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  onSave,
  saving,
  savedMsg,
  extra,
}: {
  title: string
  description: string
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  savedMsg?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{description}</p>
        </div>
        {extra}
      </div>
      {children}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className={`text-sm font-medium ${savedMsg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
          {savedMsg ?? ''}
        </span>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Scoring weights editor ───────────────────────────────────────────────────

function WeightsEditor({
  weights,
  onChange,
}: {
  weights: ScoringWeights
  onChange: (field: keyof ScoringWeights, val: number) => void
}) {
  const wi = (label: string, field: keyof ScoringWeights) => (
    <WeightInput key={field} label={label} field={field} weights={weights} onChange={onChange} />
  )
  const rc = (
    label: string,
    rateField: keyof ScoringWeights,
    capField: keyof ScoringWeights,
  ) => (
    <RateCapRow
      key={rateField}
      label={label}
      rateField={rateField}
      capField={capField}
      weights={weights}
      onChange={onChange}
    />
  )

  return (
    <div className="space-y-6">
      <WeightGroup title="A — Strong Christian Status">
        {wi('Born again', 'is_born_again')}
        {wi('Speaks in tongues', 'speaks_in_tongues')}
        {wi('Has call to ministry', 'has_call_to_ministry')}
        {wi('Prays regularly (≥1 hr/day)', 'prays_regularly')}
        {wi('Pays tithes regularly', 'pays_tithes_regularly')}
      </WeightGroup>

      <WeightGroup title="B — Disqualifiers">
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          Negative values. Any disqualifier also flags the candidate for manual review regardless of score.
        </div>
        {wi('Spiritual / character problem', 'has_spiritual_character_problem')}
        {wi('Known moral problem', 'has_known_moral_problem')}
        {wi('Known thief', 'is_known_thief')}
        {wi('Has shown disloyalty', 'has_shown_disloyalty')}
      </WeightGroup>

      <WeightGroup title="C — Loyalty & Service">
        <div className="hidden sm:flex text-xs text-gray-500 gap-x-4 font-medium pb-1">
          <span className="flex-1"></span>
          <div className="flex justify-end gap-8 pr-1">
            <span>× rate</span>
            <span>cap pts</span>
          </div>
        </div>
        {rc('Years of UO membership', 'years_of_membership_rate', 'years_of_membership_cap')}
        {rc('Times volunteered at programs', 'volunteer_times_rate', 'volunteer_times_cap')}
        {wi('Volunteers in church offices', 'volunteers_in_church_offices')}
        {rc('Years as full-time worker', 'years_fulltime_worker_rate', 'years_fulltime_worker_cap')}
        {wi('In full-time ministry', 'is_fulltime_ministry')}
        {wi('Is a missionary', 'is_missionary')}
        {wi('Is a missionary wife', 'is_missionary_wife')}
        {wi('Is a BENMP', 'is_benmp')}
      </WeightGroup>

      <WeightGroup title="D — Fruitfulness">
        {wi('Preaches to 20+ members/week', 'preaches_to_20plus')}
        {wi('Preaches to 10 or fewer members/week', 'preaches_to_10_or_less')}
        {rc('Centers / gatherings planted', 'centers_planted_rate', 'centers_planted_cap')}
      </WeightGroup>

      <WeightGroup title="E — Trained & Equipped">
        {rc('Camps attended with Prophet', 'camps_with_prophet_rate', 'camps_with_prophet_cap')}
        {rc('Camps attended with Bishops', 'camps_with_bishops_rate', 'camps_with_bishops_cap')}
        {rc('Root camps attended', 'root_camps_attended_rate', 'root_camps_attended_cap')}
      </WeightGroup>

      <WeightGroup title="G — Pineapple Patch">
        {wi('Tablet with all Bishop Dag\'s books', 'has_tablet_with_books')}
        {wi('Hard copies of Prophet\'s books', 'has_hard_copies_books')}
        {wi('Tablet with Bibles & Bible Study Aids', 'has_tablet_with_bibles')}
        {wi('Hard copies of Bibles', 'has_hard_copies_bibles')}
        {wi('UO Audio Library access', 'has_audio_library_access')}
        {wi('Communicates with Prophet regularly', 'communicates_with_prophet')}
        {wi('Communicates with Mothers regularly', 'communicates_with_mothers')}
        {wi('Communicates with other Bishops', 'communicates_with_bishops')}
        {wi('Interest in other church activities', 'interest_in_church_activities')}
      </WeightGroup>
    </div>
  )
}

function WeightGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-1">
        {title}
      </h3>
      {children}
    </div>
  )
}
