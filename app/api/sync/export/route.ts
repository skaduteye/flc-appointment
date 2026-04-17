import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exportToSheet } from '@/lib/sheets'
import type { Candidate } from '@/lib/types'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    await exportToSheet(data as Candidate[])

    // Mark all as synced
    await supabase
      .from('candidates')
      .update({ last_synced_at: new Date().toISOString() })
      .is('last_synced_at', null)

    return NextResponse.json({ exported: data.length })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    )
  }
}
