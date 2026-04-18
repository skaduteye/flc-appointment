import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSms, isValidGhanaPhone } from '@/lib/sms'
import type { CandidateStatus } from '@/lib/types'
import { requireApiUser } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BATCH_SIZE = 1000 // FlashSMS max recipients per request

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  const ip = getClientIp(req)
  const smsRate = checkRateLimit(`sms-broadcast:${ip}`, 3, 60_000)
  if (!smsRate.allowed) {
    return NextResponse.json(
      { error: 'Too many broadcast attempts. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(smsRate.retryAfterMs / 1000)) } }
    )
  }

  let body: { message: string; statusFilter?: CandidateStatus | 'all'; campaignName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message, statusFilter = 'all', campaignName } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  if (message.trim().length > 480) {
    return NextResponse.json({ error: 'message is too long (max 480 characters)' }, { status: 400 })
  }

  if (!['all', 'pending', 'under_review', 'approved', 'rejected'].includes(statusFilter)) {
    return NextResponse.json({ error: 'Invalid statusFilter value' }, { status: 400 })
  }

  const supabase = getAdminClient()

  let query = supabase.from('candidates').select('phone_number, full_name, surname')
  if (statusFilter !== 'all') query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter to valid numbers only
  const phones = (data ?? [])
    .map((c) => c.phone_number as string | null)
    .filter((p): p is string => !!p && isValidGhanaPhone(p))

  if (phones.length === 0) {
    return NextResponse.json({ error: 'No valid phone numbers in this group' }, { status: 400 })
  }

  // Batch into chunks of 1000
  let totalSent = 0
  let totalCredits = 0
  const errors: string[] = []

  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const batch = phones.slice(i, i + BATCH_SIZE)
    const result = await sendSms(batch, message, campaignName)
    if (result.success) {
      totalSent += result.recipientsSent ?? 0
      totalCredits += result.creditsUsed ?? 0
    } else {
      errors.push(result.error ?? 'Batch failed')
    }
  }

  if (totalSent === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({
    sent: totalSent,
    creditsUsed: totalCredits,
    total: phones.length,
    warnings: errors.length > 0 ? errors : undefined,
  })
}
