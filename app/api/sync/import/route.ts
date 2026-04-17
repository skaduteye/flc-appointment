import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { importFromSheet } from '@/lib/sheets'
import { calculateScore } from '@/lib/scoring'

export async function POST() {
  try {
    const rows = await importFromSheet()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let inserted = 0
    let updated = 0

    for (const row of rows) {
      const { total, isDisqualified } = calculateScore(row)
      const record = {
        ...row,
        total_score: total,
        is_disqualified: isDisqualified,
        last_synced_at: new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('candidates')
        .select('id')
        .eq('sheet_row_id', row.sheet_row_id ?? '')
        .maybeSingle()

      if (existing) {
        await supabase.from('candidates').update(record).eq('id', existing.id)
        updated++
      } else {
        await supabase.from('candidates').insert(record)
        inserted++
      }
    }

    return NextResponse.json({ inserted, updated, total: rows.length })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    )
  }
}
