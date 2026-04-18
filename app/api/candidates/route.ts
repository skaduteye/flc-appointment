import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateScore } from '@/lib/scoring'
import { getAllSettings } from '@/lib/settings'
import {
  sendSms,
  buildSubmissionMessage,
  isValidGhanaPhone,
} from '@/lib/sms'
import {
  invalidateOlderDuplicates,
  normalizeIdentityForDedup,
  normalizePhoneForDedup,
} from '@/lib/duplicates'
import type { CandidateInput, CandidateStatus } from '@/lib/types'
import { requireApiUser } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function resolveAutoStatus(total: number, threshold: number): CandidateStatus {
  if (total >= threshold) return 'under_review'
  return 'pending'
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

// POST /api/candidates — public submission
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const submissionRate = checkRateLimit(`apply:${ip}`, 8, 60_000)
  if (!submissionRate.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(submissionRate.retryAfterMs / 1000)) } }
    )
  }

  let body: CandidateInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.full_name?.trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  }
  if (!body.surname?.trim()) {
    return NextResponse.json({ error: 'surname is required' }, { status: 400 })
  }
  if (!body.phone_number?.trim() || !isValidGhanaPhone(body.phone_number)) {
    return NextResponse.json({ error: 'A valid Ghana phone_number is required' }, { status: 400 })
  }

  const settings = await getAllSettings()
  const { total, isDisqualified } = calculateScore(body, settings.scoring_weights)
  const autoStatus = resolveAutoStatus(total, settings.score_threshold)
  const normalizedPhone = normalizePhoneForDedup(body.phone_number)
  const identityKey = normalizeIdentityForDedup(body.full_name, body.surname)

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      ...body,
      phone_number_normalized: normalizedPhone,
      dedup_identity_key: identityKey,
      total_score: total,
      is_disqualified: isDisqualified,
      is_duplicate: false,
      is_invalid: false,
      duplicate_of_id: null,
      status: autoStatus,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Insert error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: `Failed to save candidate: ${error.message}` }, { status: 500 })
  }

  try {
    await invalidateOlderDuplicates(supabase, data.id, normalizedPhone, identityKey)
  } catch (dupErr) {
    console.error('Duplicate invalidation error:', dupErr)
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
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  const supabase = getAdminClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const invalid = searchParams.get('invalid')
  const oversight = searchParams.get('oversight')
  const oversightArea = searchParams.get('oversight_area')
  const sort = searchParams.get('sort') ?? 'total_score'
  const order = searchParams.get('order') ?? 'desc'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = (page - 1) * limit

  let query = supabase.from('candidates').select('*', { count: 'exact' })

  if (invalid === '1') {
    query = query.eq('is_invalid', true)
  } else {
    query = query.eq('is_invalid', false)
  }

  if (status) query = query.eq('status', status)
  if (search) {
    const q = search.replace(/,/g, ' ').trim()
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,surname.ilike.%${q}%,phone_number.ilike.%${q}%,oversight.ilike.%${q}%,oversight_area.ilike.%${q}%`
      )
    }
  }
  if (oversight) query = query.eq('oversight', oversight)
  if (oversightArea) query = query.eq('oversight_area', oversightArea)

  query = query.order(sort, { ascending: order === 'asc' })
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count, page, limit })
}
