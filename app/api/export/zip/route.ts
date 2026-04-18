import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import JSZip from 'jszip'
import { getR2Client } from '@/app/api/upload/photo/route'
import type { Candidate, CandidateStatus } from '@/lib/types'
import { requireApiUser } from '@/lib/api-auth'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

async function fetchPhotoBytes(key: string): Promise<Buffer | null> {
  try {
    const client = getR2Client()
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
    const response = await client.send(command)
    if (!response.Body) return null
    // response.Body is a readable stream (Node.js)
    const chunks: Uint8Array[] = []
    // @ts-expect-error Body is SdkStreamMixin with async iterator
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

const CSV_COLUMNS: { label: string; key: keyof Candidate }[] = [
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
  { label: 'Born Again', key: 'is_born_again' },
  { label: 'Speaks in Tongues', key: 'speaks_in_tongues' },
  { label: 'Call to Ministry', key: 'has_call_to_ministry' },
  { label: 'Prays Regularly', key: 'prays_regularly' },
  { label: 'Pays Tithes', key: 'pays_tithes_regularly' },
  { label: 'Spiritual Character Problem', key: 'has_spiritual_character_problem' },
  { label: 'Spiritual Character Detail', key: 'spiritual_character_detail' },
  { label: 'Known Moral Problem', key: 'has_known_moral_problem' },
  { label: 'Moral Problem Detail', key: 'moral_problem_detail' },
  { label: 'Known Thief', key: 'is_known_thief' },
  { label: 'Shown Disloyalty', key: 'has_shown_disloyalty' },
  { label: 'Years of Membership', key: 'years_of_membership' },
  { label: 'Volunteer Times', key: 'volunteer_times' },
  { label: 'Volunteers in Church Offices', key: 'volunteers_in_church_offices' },
  { label: 'Years Fulltime Worker', key: 'years_fulltime_worker' },
  { label: 'Fulltime Ministry', key: 'is_fulltime_ministry' },
  { label: 'Missionary', key: 'is_missionary' },
  { label: 'Missionary Wife', key: 'is_missionary_wife' },
  { label: 'BENMP', key: 'is_benmp' },
  { label: 'Preaches to 20+', key: 'preaches_to_20plus' },
  { label: 'Preaches to 10 or Less', key: 'preaches_to_10_or_less' },
  { label: 'Centers Planted', key: 'centers_planted' },
  { label: 'Camps with Prophet', key: 'camps_with_prophet' },
  { label: 'Camp Names', key: 'camps_with_prophet_list' },
  { label: 'Camps with Bishops', key: 'camps_with_bishops' },
  { label: 'Root Camps Attended', key: 'root_camps_attended' },
  { label: 'Has Tablet with Books', key: 'has_tablet_with_books' },
  { label: 'Has Hard Copy Books', key: 'has_hard_copies_books' },
  { label: 'Has Tablet with Bibles', key: 'has_tablet_with_bibles' },
  { label: 'Has Hard Copy Bibles', key: 'has_hard_copies_bibles' },
  { label: 'Audio Library Access', key: 'has_audio_library_access' },
  { label: 'Communicates with Prophet', key: 'communicates_with_prophet' },
  { label: 'Communicates with Mothers', key: 'communicates_with_mothers' },
  { label: 'Communicates with Bishops', key: 'communicates_with_bishops' },
  { label: 'Interest in Church Activities', key: 'interest_in_church_activities' },
  { label: 'Photo Filename', key: 'photo_url' },
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
  const zip = new JSZip()

  // Build CSV rows — photo column shows filename in photos/ folder
  const photoFolder = zip.folder('photos')!
  const csvLines: string[] = [CSV_COLUMNS.map((c) => escapeCell(c.label)).join(',')]

  // Fetch all photos in parallel (up to 20 at a time to avoid overwhelming R2)
  const BATCH = 20
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (row) => {
        if (row.photo_url) {
          const bytes = await fetchPhotoBytes(row.photo_url)
          if (bytes) {
            // Use last segment as filename: "passport-photos/john-doe-abc123.jpg" → "john-doe-abc123.jpg"
            const filename = row.photo_url.split('/').pop()!
            photoFolder.file(filename, bytes)
          }
        }
      })
    )
  }

  // Build CSV lines (photo column = filename only, matching what's in photos/ folder)
  for (const row of rows) {
    const photoFilename = row.photo_url ? row.photo_url.split('/').pop()! : ''
    const line = CSV_COLUMNS.map((c) => {
      if (c.key === 'photo_url') return escapeCell(photoFilename)
      return escapeCell(row[c.key])
    }).join(',')
    csvLines.push(line)
  }

  const csvContent = csvLines.join('\r\n')
  zip.file('candidates.csv', csvContent)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `candidates${status ? `-${status}` : ''}-${dateStr}.zip`

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
