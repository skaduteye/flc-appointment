export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'under_review'

export const OVERSIGHT_OPTIONS = [
  'PAUL BAIDOO',
  'ISAAC OFORI AGYEMAN',
  'ISAAC NAKOJA',
  'EMMANUEL AMARTEY',
  'FRANK OPOKU',
  'EDWIN OGOE',
  'DANIEL ADJEI',
  'ISAAC KORANTENG',
  'SOLOMON TAY',
  'BENJAMIN FIADONU',
  'KIKI HEWARD-MILLS',
  'JONATHAN LONGDON',
  'NATHAN KUDOWOR',
  'PETER ONASIS',
  'THADDEUS BOADI',
  'JOHN THOMAS',
] as const

/** Mutable defaults used as fallback when the API is unavailable */
export const DEFAULT_OVERSIGHT_OPTIONS: string[] = [...OVERSIGHT_OPTIONS]

export const OVERSIGHT_AREA_OPTIONS = [
  'AREA 1',
  'AREA 2 (PHILIPPIANS/ GALATIANS/ EPHESIANS, ETC)',
  'AREA 3 (CHOIR, FILM STARS, DANCING STARS, ETC)',
  'AREA 4 (SHEEP SEEKING, AIRPORT STARS, USHERS, ETC)',
  'AREA 5 (OTHER CAMPUSES- KOINONIA, PASSION, ENERGY, ETC)',
  'AREA 6 (ASHESI, MIOTSO)',
] as const

/** Mutable defaults used as fallback when the API is unavailable */
export const DEFAULT_OVERSIGHT_AREAS: string[] = [...OVERSIGHT_AREA_OPTIONS]

export interface Candidate {
  id: string
  created_at: string
  updated_at: string

  // Identity (Section 1)
  full_name: string
  surname: string
  date_of_birth: string | null
  gender: 'MALE' | 'FEMALE' | null
  oversight: string | null
  oversight_area: string | null
  phone_number: string | null

  // SMS tracking
  sms_sent_at: string | null
  sms_message_id: string | null

  // Category A — Strong Christian Status
  is_born_again: boolean
  speaks_in_tongues: boolean
  has_call_to_ministry: boolean
  prays_regularly: boolean
  pays_tithes_regularly: boolean

  // Category B — Sweet Influences (disqualifiers)
  has_spiritual_character_problem: boolean
  spiritual_character_detail: string | null
  has_known_moral_problem: boolean
  moral_problem_detail: string | null
  is_known_thief: boolean
  has_shown_disloyalty: boolean

  // Category C — Loyalty Status
  years_of_membership: number
  volunteer_times: number
  volunteers_in_church_offices: boolean
  years_fulltime_worker: number
  is_fulltime_ministry: boolean
  is_missionary: boolean
  is_missionary_wife: boolean
  is_benmp: boolean

  // Category D — Fruitfulness Status
  preaches_to_20plus: boolean
  preaches_to_10_or_less: boolean
  centers_planted: number

  // Category E — Servants Armed and Trained
  camps_with_prophet: number
  camps_with_prophet_list: string | null
  camps_with_bishops: number
  root_camps_attended: number

  // Category G — Pineapple Patch
  has_tablet_with_books: boolean
  has_hard_copies_books: boolean
  has_tablet_with_bibles: boolean
  has_hard_copies_bibles: boolean
  has_audio_library_access: boolean
  communicates_with_prophet: boolean
  communicates_with_mothers: boolean
  communicates_with_bishops: boolean
  interest_in_church_activities: boolean

  // Photo
  photo_url: string | null

  // Computed / admin
  total_score: number
  is_disqualified: boolean
  is_duplicate: boolean
  is_invalid: boolean
  duplicate_of_id: string | null
  phone_number_normalized: string | null
  dedup_identity_key: string | null
  status: CandidateStatus
  admin_notes: string | null
  sheet_row_id: string | null
  last_synced_at: string | null
}

export type CandidateInput = Omit<Candidate,
  'id' | 'created_at' | 'updated_at' | 'total_score' | 'is_disqualified' | 'is_duplicate' | 'is_invalid' |
  'duplicate_of_id' | 'phone_number_normalized' | 'dedup_identity_key' | 'status' | 'admin_notes' |
  'sheet_row_id' | 'last_synced_at' | 'sms_sent_at' | 'sms_message_id'
> & { sheet_row_id?: string | null }

export interface ScoreBreakdown {
  spiritual: number    // Cat A
  disqualifiers: number // Cat B
  membership: number   // Cat C
  ministry: number     // Cat D
  equipped: number     // Cat E
  pineapple: number    // Cat G
  total: number
  // legacy fields (kept for backward compat)
  lifestyle: number
  resources: number
  communication: number
}

export interface SyncStatus {
  last_import_at: string | null
  last_export_at: string | null
  sheet_row_count: number
  db_row_count: number
}
