import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '@/lib/scoring'
import { sendSms, buildStatusChangeMessage, isValidGhanaPhone } from '@/lib/sms'
import type { CandidateInput, CandidateStatus } from '@/lib/types'
import { requireApiUser } from '@/lib/api-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(_req)
  if (auth.response) return auth.response

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
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  const { id } = await params
  const supabase = getAdminClient()
  let body: Partial<CandidateInput & { status: string; admin_notes: string; total_score: number }>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    body.status !== undefined &&
    !['pending', 'under_review', 'approved', 'rejected'].includes(body.status)
  ) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  if (body.admin_notes !== undefined && typeof body.admin_notes !== 'string') {
    return NextResponse.json({ error: 'admin_notes must be a string' }, { status: 400 })
  }

  if (
    body.total_score !== undefined &&
    (!Number.isFinite(body.total_score) || body.total_score < 0)
  ) {
    return NextResponse.json({ error: 'total_score must be a non-negative number' }, { status: 400 })
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
  let existingStatus: string | undefined

  if (hasScoreField) {
    const { data: existing } = await supabase.from('candidates').select('*').eq('id', id).single()
    if (existing) {
      existingStatus = existing.status
      const merged = { ...existing, ...body } as CandidateInput
      const { total } = calculateScore(merged)
      // is_disqualified is admin-only — never auto-overwrite it during score recalc
      updates = { ...updates, total_score: total }
    }
  }

  // Fetch current status before applying the update so we can detect changes
  const newStatus = updates.status as CandidateStatus | undefined
  const prevStatus = newStatus
    ? (existingStatus ?? (await supabase.from('candidates').select('status').eq('id', id).single())?.data?.status)
    : undefined

  const { data, error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (
    newStatus &&
    newStatus !== prevStatus &&
    data.phone_number &&
    isValidGhanaPhone(data.phone_number)
  ) {
    const msg = buildStatusChangeMessage(data, newStatus)
    if (msg) {
      void sendSms([data.phone_number], msg, `Status: ${newStatus}`).catch((e) =>
        console.error('Status SMS failed:', e)
      )
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(_req)
  if (auth.response) return auth.response

  const { id } = await params
  const supabase = getAdminClient()
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
