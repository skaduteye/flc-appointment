import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })

  const { data: lastSynced } = await supabase
    .from('candidates')
    .select('last_synced_at')
    .not('last_synced_at', 'is', null)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    db_row_count: count ?? 0,
    last_synced_at: lastSynced?.last_synced_at ?? null,
  })
}
