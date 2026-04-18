import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, updateSetting } from '@/lib/settings'
import type { AppSettings } from '@/lib/settings'

export async function GET() {
  const settings = await getAllSettings()
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  let body: Partial<AppSettings>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed: (keyof AppSettings)[] = [
    'oversight_options', 'oversight_areas', 'score_threshold', 'scoring_weights',
  ]

  for (const key of allowed) {
    if (key in body) {
      await updateSetting(key, body[key])
    }
  }

  const updated = await getAllSettings()
  return NextResponse.json(updated)
}
