import { createClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  // Cat A
  is_born_again: number
  speaks_in_tongues: number
  has_call_to_ministry: number
  prays_regularly: number
  pays_tithes_regularly: number
  // Cat B
  has_spiritual_character_problem: number
  has_known_moral_problem: number
  is_known_thief: number
  has_shown_disloyalty: number
  // Cat C — numeric with rate+cap
  years_of_membership_rate: number
  years_of_membership_cap: number
  volunteer_times_rate: number
  volunteer_times_cap: number
  volunteers_in_church_offices: number
  years_fulltime_worker_rate: number
  years_fulltime_worker_cap: number
  is_fulltime_ministry: number
  is_missionary: number
  is_missionary_wife: number
  is_benmp: number
  // Cat D
  preaches_to_20plus: number
  preaches_to_10_or_less: number
  centers_planted_rate: number
  centers_planted_cap: number
  // Cat E
  camps_with_prophet_rate: number
  camps_with_prophet_cap: number
  camps_with_bishops_rate: number
  camps_with_bishops_cap: number
  root_camps_attended_rate: number
  root_camps_attended_cap: number
  // Cat G
  has_tablet_with_books: number
  has_hard_copies_books: number
  has_tablet_with_bibles: number
  has_hard_copies_bibles: number
  has_audio_library_access: number
  communicates_with_prophet: number
  communicates_with_mothers: number
  communicates_with_bishops: number
  interest_in_church_activities: number
}

export interface AppSettings {
  oversight_options: string[]
  oversight_areas: string[]
  score_threshold: number
  admin_phone: string | null
  scoring_weights: ScoringWeights
}

// ─── Defaults (mirror migration seed) ────────────────────────────────────────

export const DEFAULT_OVERSIGHT_OPTIONS = [
  'PAUL BAIDOO', 'ISAAC OFORI AGYEMAN', 'ISAAC NAKOJA', 'EMMANUEL AMARTEY',
  'FRANK OPOKU', 'EDWIN OGOE', 'DANIEL ADJEI', 'ISAAC KORANTENG',
  'SOLOMON TAY', 'BENJAMIN FIADONU', 'KIKI HEWARD-MILLS',
  'JONATHAN LONGDON', 'NATHAN KUDOWOR',
]

export const DEFAULT_OVERSIGHT_AREAS = [
  'AREA 1',
  'AREA 2 (PHILIPPIANS/ GALATIANS/ EPHESIANS, ETC)',
  'AREA 3 (CHOIR, FILM STARS, DANCING STARS, ETC)',
  'AREA 4 (SHEEP SEEKING, AIRPORT STARS, USHERS, ETC)',
  'AREA 5 (OTHER CAMPUSES- KOINONIA, PASSION, ENERGY, ETC)',
  'AREA 6 (ASHESI, MIOTSO)',
]

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  is_born_again: 10, speaks_in_tongues: 10, has_call_to_ministry: 10,
  prays_regularly: 50, pays_tithes_regularly: 50,
  has_spiritual_character_problem: -100, has_known_moral_problem: -100,
  is_known_thief: -100, has_shown_disloyalty: -100,
  years_of_membership_rate: 3, years_of_membership_cap: 10,
  volunteer_times_rate: 3, volunteer_times_cap: 10,
  volunteers_in_church_offices: 10,
  years_fulltime_worker_rate: 5, years_fulltime_worker_cap: 20,
  is_fulltime_ministry: 200, is_missionary: 200,
  is_missionary_wife: 100, is_benmp: 50,
  preaches_to_20plus: 200, preaches_to_10_or_less: 100,
  centers_planted_rate: 25, centers_planted_cap: 100,
  camps_with_prophet_rate: 25, camps_with_prophet_cap: 100,
  camps_with_bishops_rate: 5, camps_with_bishops_cap: 20,
  root_camps_attended_rate: 5, root_camps_attended_cap: 20,
  has_tablet_with_books: 50, has_hard_copies_books: 50,
  has_tablet_with_bibles: 50, has_hard_copies_bibles: 50,
  has_audio_library_access: 50,
  communicates_with_prophet: 100, communicates_with_mothers: 50,
  communicates_with_bishops: 50, interest_in_church_activities: 30,
}

export const DEFAULT_SETTINGS: AppSettings = {
  oversight_options: DEFAULT_OVERSIGHT_OPTIONS,
  oversight_areas: DEFAULT_OVERSIGHT_AREAS,
  score_threshold: 700,
  admin_phone: null,
  scoring_weights: DEFAULT_SCORING_WEIGHTS,
}

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAllSettings(): Promise<AppSettings> {
  try {
    const supabase = getClient()
    const { data } = await supabase.from('settings').select('key, value')
    if (!data || data.length === 0) return DEFAULT_SETTINGS

    const map = Object.fromEntries(data.map((r) => [r.key, r.value]))
    return {
      oversight_options: (map.oversight_options as string[]) ?? DEFAULT_SETTINGS.oversight_options,
      oversight_areas: (map.oversight_areas as string[]) ?? DEFAULT_SETTINGS.oversight_areas,
      score_threshold: (map.score_threshold as number) ?? DEFAULT_SETTINGS.score_threshold,
      admin_phone: (map.admin_phone as string | null) ?? null,
      scoring_weights: {
        ...DEFAULT_SCORING_WEIGHTS,
        ...(map.scoring_weights as Partial<ScoringWeights> ?? {}),
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateSetting(key: keyof AppSettings, value: unknown): Promise<void> {
  const supabase = getClient()
  await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
}
