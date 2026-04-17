import type { CandidateInput, ScoreBreakdown } from './types'

// Cap helper: returns minimum of (value * ratePerUnit) and cap
function capped(count: number, ratePerUnit: number, cap: number): number {
  return Math.min(count * ratePerUnit, cap)
}

// UO-FLC190 Pastoral Appointment Point System
// Maximum attainable: 1350 points
// Minimum for consideration: 700 points
export function calculateScore(c: CandidateInput): {
  total: number
  breakdown: ScoreBreakdown
  isDisqualified: boolean
} {
  // Category A — Strong Christian Status (max 130)
  const spiritual =
    (c.is_born_again ? 10 : 0) +
    (c.speaks_in_tongues ? 10 : 0) +
    (c.has_call_to_ministry ? 10 : 0) +
    (c.prays_regularly ? 50 : 0) +
    (c.pays_tithes_regularly ? 50 : 0)

  // Category B — Sweet Influences (disqualifiers, each capped at -100)
  const disqualifiers =
    (c.has_spiritual_character_problem ? -100 : 0) +
    (c.has_known_moral_problem ? -100 : 0) +
    (c.is_known_thief ? -100 : 0) +
    (c.has_shown_disloyalty ? -100 : 0)

  // Category C — Loyalty Status (max 600)
  // C1: years membership — 3pts/year, capped at 10
  // C2: special program volunteer times — 3pts/time, capped at 10
  // C3: volunteers in church offices (lay basis) — flat 10
  // C4: years as FT worker — 5pts/year, capped at 20
  // C5–C8: ministry roles
  const loyalty =
    capped(c.years_of_membership, 3, 10) +
    capped(c.volunteer_times, 3, 10) +
    (c.volunteers_in_church_offices ? 10 : 0) +
    capped(c.years_fulltime_worker, 5, 20) +
    (c.is_fulltime_ministry ? 200 : 0) +
    (c.is_missionary ? 200 : 0) +
    (c.is_missionary_wife ? 100 : 0) +
    (c.is_benmp ? 50 : 0)

  // Category D — Fruitfulness Status (max 400)
  // D3: centers planted — 25 per center, capped at 100
  const fruitfulness =
    (c.preaches_to_20plus ? 200 : 0) +
    (c.preaches_to_10_or_less ? 100 : 0) +
    capped(c.centers_planted, 25, 100)

  // Category E — Servants Armed and Trained (max 140)
  // E1: camps with Prophet — 25 per camp, capped at 100
  // E2: camps with Bishops — 5 per camp, capped at 20
  // E3: root camps — 5 per camp, capped at 20
  const equipped =
    capped(c.camps_with_prophet, 25, 100) +
    capped(c.camps_with_bishops, 5, 20) +
    capped(c.root_camps_attended, 5, 20)

  // Category G — Pineapple Patch (max 480)
  const pineapple =
    (c.has_tablet_with_books ? 50 : 0) +
    (c.has_hard_copies_books ? 50 : 0) +
    (c.has_tablet_with_bibles ? 50 : 0) +
    (c.has_hard_copies_bibles ? 50 : 0) +
    (c.has_audio_library_access ? 50 : 0) +
    (c.communicates_with_prophet ? 100 : 0) +
    (c.communicates_with_mothers ? 50 : 0) +
    (c.communicates_with_bishops ? 50 : 0) +
    (c.interest_in_church_activities ? 30 : 0)

  const total = spiritual + disqualifiers + loyalty + fruitfulness + equipped + pineapple

  const isDisqualified =
    c.has_spiritual_character_problem ||
    c.has_known_moral_problem ||
    c.is_known_thief ||
    c.has_shown_disloyalty

  return {
    total,
    breakdown: {
      spiritual,
      disqualifiers,
      membership: loyalty,
      ministry: fruitfulness,
      equipped,
      pineapple,
      total,
      // legacy
      lifestyle: 0,
      resources: equipped + pineapple,
      communication: 0,
    },
    isDisqualified,
  }
}

export const SCORE_THRESHOLD = 700
export const SCORE_MAXIMUM = 1350
