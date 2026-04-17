import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSms, isValidGhanaPhone } from '@/lib/sms'
import type { CandidateStatus } from '@/lib/types'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BATCH_SIZE = 1000 // FlashSMS max recipients per request

export async function POST(req: NextRequest) {
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

  return NextResponse.json({
    sent: totalSent,
    creditsUsed: totalCredits,
    total: phones.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
