import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '@/lib/scoring'
import { getAllSettings } from '@/lib/settings'
import {
  invalidateOlderDuplicates,
  normalizeIdentityForDedup,
  normalizePhoneForDedup,
} from '@/lib/duplicates'
import { requireApiUser } from '@/lib/api-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function parseBoolean(val: string): boolean {
  return ['yes', 'true', '1'].includes((val ?? '').trim().toLowerCase())
}

function parseNumber(val: string): number {
  const n = parseInt(val, 10)
  return isNaN(n) ? 0 : Math.max(0, n)
}

// Column index → field name mapping (matches original Google Sheet column order)
const COLUMN_MAP: Record<number, string> = {
  0: 'full_name',
  1: 'is_born_again',
  2: 'speaks_in_tongues',
  3: 'has_call_to_ministry',
  4: 'prays_regularly',
  5: 'pays_tithes_regularly',
  6: 'has_spiritual_character_problem',
  // 7: empty
  8: 'has_known_moral_problem',
  9: 'is_known_thief',
  10: 'has_shown_disloyalty',
  11: 'years_of_membership',
  12: 'volunteer_times',
  // 13: empty
  14: 'years_fulltime_worker',
  15: 'is_fulltime_ministry',
  16: 'is_missionary',
  17: 'is_missionary_wife',
  18: 'is_benmp',
  19: 'preaches_to_20plus',
  20: 'preaches_to_10_or_less',
  21: 'centers_planted',
  22: 'camps_with_prophet',
  // 23: empty
  24: 'camps_with_bishops',
  25: 'root_camps_attended',
  26: 'has_tablet_with_books',
  27: 'has_hard_copies_books',
  28: 'has_tablet_with_bibles',
  29: 'has_audio_library_access',
  30: 'communicates_with_prophet',
  31: 'communicates_with_mothers',
  32: 'communicates_with_bishops',
  33: 'interest_in_church_activities',
}

const BOOLEAN_FIELDS = new Set([
  'is_born_again', 'speaks_in_tongues', 'has_call_to_ministry', 'prays_regularly',
  'pays_tithes_regularly', 'has_spiritual_character_problem', 'has_known_moral_problem',
  'is_known_thief', 'has_shown_disloyalty', 'is_fulltime_ministry', 'is_missionary',
  'is_missionary_wife', 'is_benmp', 'preaches_to_20plus', 'preaches_to_10_or_less',
  'has_tablet_with_books', 'has_hard_copies_books', 'has_tablet_with_bibles',
  'has_audio_library_access', 'communicates_with_prophet', 'communicates_with_mothers',
  'communicates_with_bishops', 'interest_in_church_activities',
])

const NUMERIC_FIELDS = new Set([
  'years_of_membership', 'volunteer_times', 'years_fulltime_worker',
  'centers_planted', 'camps_with_prophet', 'camps_with_bishops', 'root_camps_attended',
])

function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cols: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          cols.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
      cols.push(current.trim())
      return cols
    })
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  let text: string
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    text = await file.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 })
  }

  const rows = parseCSV(text)
  if (rows.length === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })

  // Skip header rows (rows where column 0 is not a candidate name)
  const dataRows = rows.filter((row) => {
    const first = (row[0] ?? '').trim()
    return first && !['candidate', 'name', 'score', '10', '50'].some((h) =>
      first.toLowerCase().startsWith(h)
    )
  })

  const settings = await getAllSettings()
  const supabase = getAdminClient()

  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of dataRows) {
    try {
      const record: Record<string, unknown> = {
        surname: '',
        volunteers_in_church_offices: false,
        has_hard_copies_bibles: false,
        camps_with_prophet_list: null,
        spiritual_character_detail: null,
        moral_problem_detail: null,
        date_of_birth: null,
        gender: null,
        oversight: null,
        oversight_area: null,
        phone_number: null,
      }

      for (const [colIdx, field] of Object.entries(COLUMN_MAP)) {
        const val = (row[Number(colIdx)] ?? '').trim()
        if (BOOLEAN_FIELDS.has(field)) {
          record[field] = parseBoolean(val)
        } else if (NUMERIC_FIELDS.has(field)) {
          record[field] = parseNumber(val)
        } else {
          record[field] = val
        }
      }

      if (!record.full_name) { skipped++; continue }

      const { total, isDisqualified } = calculateScore(record as never, settings.scoring_weights)
      const normalizedPhone = normalizePhoneForDedup(record.phone_number as string | null)
      const identityKey = normalizeIdentityForDedup(
        record.full_name as string | null,
        record.surname as string | null,
      )
      record.total_score = total
      record.is_disqualified = isDisqualified
      record.phone_number_normalized = normalizedPhone
      record.dedup_identity_key = identityKey
      record.is_duplicate = false
      record.is_invalid = false
      record.duplicate_of_id = null
      record.status = 'pending'
      record.sheet_row_id = `csv_import_${Date.now()}_${inserted}`

      const { data: insertedRow, error: insertError } = await supabase
        .from('candidates')
        .insert(record)
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      await invalidateOlderDuplicates(supabase, insertedRow.id, normalizedPhone, identityKey)
      inserted++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Row error')
    }
  }

  return NextResponse.json({ inserted, skipped, errors: errors.length ? errors : undefined })
}
