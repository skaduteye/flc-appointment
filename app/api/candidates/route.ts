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

  const { total, isDisqualified } = calculateScore(body)

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('candidates')
    .insert({ ...body, total_score: total, is_disqualified: isDisqualified })
    .select('id')
    .single()

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: 'Failed to save candidate' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
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
