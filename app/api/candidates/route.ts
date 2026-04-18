import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '@/lib/scoring'
import { getAllSettings } from '@/lib/settings'
import {
  sendSms,
  buildSubmissionMessage,
  isValidGhanaPhone,
} from '@/lib/sms'
import type { CandidateInput, CandidateStatus } from '@/lib/types'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function resolveAutoStatus(total: number, isDisqualified: boolean, threshold: number): CandidateStatus {
  if (isDisqualified) return 'under_review'
  if (total >= threshold) return 'under_review'
  return 'pending'
}

// POST /api/candidates — public submission
export async function POST(req: NextRequest) {
  let body: CandidateInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.full_name?.trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  }

  const settings = await getAllSettings()
  const { total, isDisqualified } = calculateScore(body, settings.scoring_weights)
  const autoStatus = resolveAutoStatus(total, isDisqualified, settings.score_threshold)

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      ...body,
      total_score: total,
      is_disqualified: false,
      status: autoStatus,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Insert error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: `Failed to save candidate: ${error.message}` }, { status: 500 })
  }

  await sendNotifications(data)

  return NextResponse.json({ id: data.id }, { status: 201 })
}

async function sendNotifications(
  candidate: { id: string; full_name: string; surname: string; total_score: number; phone_number: string | null },
) {
  const supabase = getAdminClient()
  const updates: Record<string, unknown> = {}

  // 1. Candidate confirmation SMS
  if (candidate.phone_number && isValidGhanaPhone(candidate.phone_number)) {
    const msg = buildSubmissionMessage(candidate)
    const result = await sendSms([candidate.phone_number], msg, 'Appointment Confirmation')
    if (result.success) {
      updates.sms_sent_at = new Date().toISOString()
      updates.sms_message_id = result.messageId
    } else {
      console.error('Candidate SMS failed:', result.error)
    }
  }

  // Save candidate SMS tracking back to DB if we have updates
  if (Object.keys(updates).length > 0) {
    await supabase.from('candidates').update(updates).eq('id', candidate.id)
  }
}

// GET /api/candidates — admin only, list with filters
export async function GET(req: NextRequest) {
  const supabase = getAdminClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') ?? 'total_score'
  const order = searchParams.get('order') ?? 'desc'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = (page - 1) * limit

  let query = supabase.from('candidates').select('*', { count: 'exact' })

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('full_name', `%${search}%`)

  query = query.order(sort, { ascending: order === 'asc' })
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count, page, limit })
}
