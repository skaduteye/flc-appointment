import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '@/lib/scoring'
import type { CandidateInput } from '@/lib/types'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getAdminClient()
  let body: Partial<CandidateInput & { status: string; admin_notes: string }>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const scoreFields = [
    'is_born_again', 'speaks_in_tongues', 'has_call_to_ministry',
    'prays_regularly', 'pays_tithes_regularly',
    'has_spiritual_character_problem', 'has_known_moral_problem',
    'is_known_thief', 'has_shown_disloyalty',
    'years_of_membership', 'volunteer_times', 'years_fulltime_worker',
    'is_fulltime_ministry', 'is_missionary', 'is_missionary_wife', 'is_benmp',
    'preaches_to_20plus', 'preaches_to_10_or_less',
    'centers_planted', 'camps_with_prophet', 'camps_with_bishops', 'root_camps_attended',
    'has_tablet_with_books', 'has_hard_copies_books', 'has_tablet_with_bibles', 'has_audio_library_access',
    'communicates_with_prophet', 'communicates_with_mothers', 'communicates_with_bishops',
    'interest_in_church_activities',
  ]

  const hasScoreField = scoreFields.some(f => f in body)
  let updates: Record<string, unknown> = { ...body }

  if (hasScoreField) {
    const { data: existing } = await supabase.from('candidates').select('*').eq('id', id).single()
    if (existing) {
      const merged = { ...existing, ...body } as CandidateInput
      const { total, isDisqualified } = calculateScore(merged)
      updates = { ...updates, total_score: total, is_disqualified: isDisqualified }
    }
  }

  const { data, error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getAdminClient()
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
