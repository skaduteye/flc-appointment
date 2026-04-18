import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Candidate, CandidateStatus } from '@/lib/types'
import { requireApiUser } from '@/lib/api-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function escape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const COLUMNS: { label: string; key: keyof Candidate }[] = [
  { label: 'ID', key: 'id' },
  { label: 'Submitted', key: 'created_at' },
  { label: 'Full Name', key: 'full_name' },
  { label: 'Surname', key: 'surname' },
  { label: 'Date of Birth', key: 'date_of_birth' },
  { label: 'Gender', key: 'gender' },
  { label: 'Phone', key: 'phone_number' },
  { label: 'Oversight', key: 'oversight' },
  { label: 'Oversight Area', key: 'oversight_area' },
  { label: 'Status', key: 'status' },
  { label: 'Total Score', key: 'total_score' },
  { label: 'Disqualified', key: 'is_disqualified' },
  { label: 'Admin Notes', key: 'admin_notes' },
  // Cat A
  { label: 'Born Again', key: 'is_born_again' },
  { label: 'Speaks in Tongues', key: 'speaks_in_tongues' },
  { label: 'Call to Ministry', key: 'has_call_to_ministry' },
  { label: 'Prays Regularly', key: 'prays_regularly' },
  { label: 'Pays Tithes', key: 'pays_tithes_regularly' },
  // Cat B
  { label: 'Spiritual Character Problem', key: 'has_spiritual_character_problem' },
  { label: 'Spiritual Character Detail', key: 'spiritual_character_detail' },
  { label: 'Known Moral Problem', key: 'has_known_moral_problem' },
  { label: 'Moral Problem Detail', key: 'moral_problem_detail' },
  { label: 'Known Thief', key: 'is_known_thief' },
  { label: 'Shown Disloyalty', key: 'has_shown_disloyalty' },
  // Cat C
  { label: 'Years of Membership', key: 'years_of_membership' },
  { label: 'Volunteer Times', key: 'volunteer_times' },
  { label: 'Volunteers in Church Offices', key: 'volunteers_in_church_offices' },
  { label: 'Years Fulltime Worker', key: 'years_fulltime_worker' },
  { label: 'Fulltime Ministry', key: 'is_fulltime_ministry' },
  { label: 'Missionary', key: 'is_missionary' },
  { label: 'Missionary Wife', key: 'is_missionary_wife' },
  { label: 'BENMP', key: 'is_benmp' },
  // Cat D
  { label: 'Preaches to 20+', key: 'preaches_to_20plus' },
  { label: 'Preaches to 10 or Less', key: 'preaches_to_10_or_less' },
  { label: 'Centers Planted', key: 'centers_planted' },
  // Cat E
  { label: 'Camps with Prophet', key: 'camps_with_prophet' },
  { label: 'Camp Names', key: 'camps_with_prophet_list' },
  { label: 'Camps with Bishops', key: 'camps_with_bishops' },
  { label: 'Root Camps Attended', key: 'root_camps_attended' },
  // Cat G
  { label: 'Has Tablet with Books', key: 'has_tablet_with_books' },
  { label: 'Has Hard Copy Books', key: 'has_hard_copies_books' },
  { label: 'Has Tablet with Bibles', key: 'has_tablet_with_bibles' },
  { label: 'Has Hard Copy Bibles', key: 'has_hard_copies_bibles' },
  { label: 'Audio Library Access', key: 'has_audio_library_access' },
  { label: 'Communicates with Prophet', key: 'communicates_with_prophet' },
  { label: 'Communicates with Mothers', key: 'communicates_with_mothers' },
  { label: 'Communicates with Bishops', key: 'communicates_with_bishops' },
  { label: 'Interest in Church Activities', key: 'interest_in_church_activities' },
  // Photo
  { label: 'Photo Key', key: 'photo_url' },
]

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  const supabase = getAdminClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as CandidateStatus | null
  const search = searchParams.get('search')
  const oversight = searchParams.get('oversight')
  const oversightArea = searchParams.get('oversight_area')

  let query = supabase.from('candidates').select('*').order('total_score', { ascending: false })
  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('full_name', `%${search}%`)
  if (oversight) query = query.eq('oversight', oversight)
  if (oversightArea) query = query.eq('oversight_area', oversightArea)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Candidate[]
  const header = COLUMNS.map((c) => escape(c.label)).join(',')
  const lines = rows.map((row) =>
    COLUMNS.map((c) => escape(row[c.key])).join(',')
  )
  const csv = [header, ...lines].join('\r\n')

  const filename = `candidates${status ? `-${status}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
