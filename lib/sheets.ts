import { google } from 'googleapis'
import type { Candidate, CandidateInput } from './types'
import { calculateScore } from './scoring'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

// Column order must match the Google Sheet exactly
const SHEET_COLUMNS = [
  'full_name',
  'is_born_again',
  'speaks_in_tongues',
  'has_call_to_ministry',
  'prays_regularly',
  'pays_tithes_regularly',
  'has_spiritual_character_problem',
  '', // empty column in original sheet
  'has_known_moral_problem',
  'is_known_thief',
  'has_shown_disloyalty',
  'years_of_membership',
  'volunteer_times',
  '', // empty column
  'years_fulltime_worker',
  'is_fulltime_ministry',
  'is_missionary',
  'is_missionary_wife',
  'is_benmp',
  'preaches_to_20plus',
  'preaches_to_10_or_less',
  'centers_planted',
  'camps_with_prophet',
  '', // empty column
  'camps_with_bishops',
  'root_camps_attended',
  'has_tablet_with_books',
  'has_hard_copies_books',
  'has_tablet_with_bibles',
  'has_audio_library_access',
  'communicates_with_prophet',
  'communicates_with_mothers',
  'communicates_with_bishops',
  'interest_in_church_activities',
] as const

function getAuth() {
  const key = process.env.GOOGLE_SA_KEY
  if (!key) throw new Error('GOOGLE_SA_KEY env var is missing')
  const credentials = JSON.parse(key)
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES })
}

function parseBoolean(val: string): boolean {
  const v = (val ?? '').trim().toLowerCase()
  return v === 'yes' || v === 'true' || v === '1'
}

function parseNumber(val: string): number {
  const n = parseInt(val, 10)
  return isNaN(n) ? 0 : n
}

function booleanFields() {
  return new Set([
    'is_born_again', 'speaks_in_tongues', 'has_call_to_ministry',
    'prays_regularly', 'pays_tithes_regularly',
    'has_spiritual_character_problem', 'has_known_moral_problem',
    'is_known_thief', 'has_shown_disloyalty',
    'is_fulltime_ministry', 'is_missionary', 'is_missionary_wife',
    'is_benmp', 'preaches_to_20plus', 'preaches_to_10_or_less',
    'has_tablet_with_books', 'has_hard_copies_books',
    'has_tablet_with_bibles', 'has_audio_library_access',
    'communicates_with_prophet', 'communicates_with_mothers',
    'communicates_with_bishops', 'interest_in_church_activities',
  ])
}

function numericFields() {
  return new Set([
    'years_of_membership', 'volunteer_times', 'years_fulltime_worker',
    'centers_planted', 'camps_with_prophet', 'camps_with_bishops', 'root_camps_attended',
  ])
}

export async function importFromSheet(): Promise<CandidateInput[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A3:AH', // row 1 = headers, row 2 = scores, data starts row 3
  })

  const rows = res.data.values ?? []
  const bools = booleanFields()
  const nums = numericFields()

  return rows
    .filter(row => row[0]?.trim()) // skip empty rows
    .map((row, rowIndex) => {
      const candidate: Record<string, unknown> = {}

      SHEET_COLUMNS.forEach((field, colIndex) => {
        if (!field) return
        const val = (row[colIndex] ?? '').toString().trim()
        if (bools.has(field)) {
          candidate[field] = parseBoolean(val)
        } else if (nums.has(field)) {
          candidate[field] = parseNumber(val)
        } else {
          candidate[field] = val
        }
      })

      // Use 1-based row number (offset by 2 header rows) as stable sheet ID
      candidate.sheet_row_id = `row_${rowIndex + 3}`

      return candidate as CandidateInput
    })
}

export async function exportToSheet(candidates: Candidate[]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const rows = candidates.map(c => {
    return SHEET_COLUMNS.map(field => {
      if (!field) return ''
      const val = (c as unknown as Record<string, unknown>)[field]
      if (typeof val === 'boolean') return val ? 'Yes' : 'No'
      return val ?? ''
    })
  })

  // Write starting at row 3 (after the 2 header/score rows)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `A3`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  })
}

export async function getSheetRowCount(): Promise<number> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A3:A',
  })
  return (res.data.values ?? []).filter(r => r[0]?.trim()).length
}
