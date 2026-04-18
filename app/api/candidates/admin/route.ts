import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CandidateStatus } from '@/lib/types'
import { requireApiUser } from '@/lib/api-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function asNullable(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  let body: {
    full_name?: string
    surname?: string
    phone_number?: string | null
    oversight?: string | null
    oversight_area?: string | null
    gender?: 'MALE' | 'FEMALE' | null
    status?: CandidateStatus
    total_score?: number
    admin_notes?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fullName = (body.full_name ?? '').trim()
  const surname = (body.surname ?? '').trim()

  if (!fullName) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
  }
  if (!surname) {
    return NextResponse.json({ error: 'surname is required' }, { status: 400 })
  }

  const status = body.status ?? 'pending'
  if (!['pending', 'under_review', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  const gender = body.gender ?? null
  if (gender !== null && gender !== 'MALE' && gender !== 'FEMALE') {
    return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 })
  }

  const totalScoreRaw = Number(body.total_score ?? 0)
  if (!Number.isFinite(totalScoreRaw) || totalScoreRaw < 0) {
    return NextResponse.json({ error: 'total_score must be a non-negative number' }, { status: 400 })
  }
  const totalScore = Math.round(totalScoreRaw)

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      full_name: fullName,
      surname,
      phone_number: asNullable(body.phone_number),
      oversight: asNullable(body.oversight),
      oversight_area: asNullable(body.oversight_area),
      gender,
      total_score: totalScore,
      status,
      admin_notes: asNullable(body.admin_notes),
      is_disqualified: false,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
