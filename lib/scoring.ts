import type { CandidateInput, ScoreBreakdown } from './types'
import { DEFAULT_SCORING_WEIGHTS, type ScoringWeights } from './settings'

function capped(count: number, rate: number, cap: number): number {
  return Math.min(count * rate, cap)
}

// UO-FLC190 Pastoral Appointment Point System
// Default max: 1350 points | Default threshold: 700 points
export function calculateScore(
  c: CandidateInput,
  w: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): {
  total: number
  breakdown: ScoreBreakdown
  isDisqualified: boolean
} {
  // Category A — Strong Christian Status
  const spiritual =
    (c.is_born_again ? w.is_born_again : 0) +
    (c.speaks_in_tongues ? w.speaks_in_tongues : 0) +
    (c.has_call_to_ministry ? w.has_call_to_ministry : 0) +
    (c.prays_regularly ? w.prays_regularly : 0) +
    (c.pays_tithes_regularly ? w.pays_tithes_regularly : 0)

  // Category B — Sweet Influences (disqualifiers)
  const disqualifiers =
    (c.has_spiritual_character_problem ? w.has_spiritual_character_problem : 0) +
    (c.has_known_moral_problem ? w.has_known_moral_problem : 0) +
    (c.is_known_thief ? w.is_known_thief : 0) +
    (c.has_shown_disloyalty ? w.has_shown_disloyalty : 0)

  // Category C — Loyalty Status
  const loyalty =
    capped(c.years_of_membership, w.years_of_membership_rate, w.years_of_membership_cap) +
    capped(c.volunteer_times, w.volunteer_times_rate, w.volunteer_times_cap) +
    (c.volunteers_in_church_offices ? w.volunteers_in_church_offices : 0) +
    capped(c.years_fulltime_worker, w.years_fulltime_worker_rate, w.years_fulltime_worker_cap) +
    (c.is_fulltime_ministry ? w.is_fulltime_ministry : 0) +
    (c.is_missionary ? w.is_missionary : 0) +
    (c.is_missionary_wife ? w.is_missionary_wife : 0) +
    (c.is_benmp ? w.is_benmp : 0)

  // Category D — Fruitfulness Status
  const fruitfulness =
    (c.preaches_to_20plus ? w.preaches_to_20plus : 0) +
    (c.preaches_to_10_or_less ? w.preaches_to_10_or_less : 0) +
    capped(c.centers_planted, w.centers_planted_rate, w.centers_planted_cap)

  // Category E — Servants Armed and Trained
  const equipped =
    capped(c.camps_with_prophet, w.camps_with_prophet_rate, w.camps_with_prophet_cap) +
    capped(c.camps_with_bishops, w.camps_with_bishops_rate, w.camps_with_bishops_cap) +
    capped(c.root_camps_attended, w.root_camps_attended_rate, w.root_camps_attended_cap)

  // Category G — Pineapple Patch
  const pineapple =
    (c.has_tablet_with_books ? w.has_tablet_with_books : 0) +
    (c.has_hard_copies_books ? w.has_hard_copies_books : 0) +
    (c.has_tablet_with_bibles ? w.has_tablet_with_bibles : 0) +
    (c.has_hard_copies_bibles ? w.has_hard_copies_bibles : 0) +
    (c.has_audio_library_access ? w.has_audio_library_access : 0) +
    (c.communicates_with_prophet ? w.communicates_with_prophet : 0) +
    (c.communicates_with_mothers ? w.communicates_with_mothers : 0) +
    (c.communicates_with_bishops ? w.communicates_with_bishops : 0) +
    (c.interest_in_church_activities ? w.interest_in_church_activities : 0)

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
      lifestyle: 0,
      resources: equipped + pineapple,
      communication: 0,
    },
    isDisqualified,
  }
}

export const SCORE_THRESHOLD = 700  // default — overridden by settings at runtime
export const SCORE_MAXIMUM = 1350
