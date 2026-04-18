import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, updateSetting } from '@/lib/settings'
import type { AppSettings } from '@/lib/settings'
import { getApiUser, requireApiUser } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const settings = await getAllSettings()

  const user = await getApiUser(req)
  if (!user) {
    return NextResponse.json({
      oversight_options: settings.oversight_options,
      oversight_areas: settings.oversight_areas,
      score_threshold: settings.score_threshold,
    })
  }

  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  let body: Partial<AppSettings>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    body.oversight_options !== undefined &&
    (!Array.isArray(body.oversight_options) || body.oversight_options.some((v) => typeof v !== 'string'))
  ) {
    return NextResponse.json({ error: 'oversight_options must be a string[]' }, { status: 400 })
  }

  if (
    body.oversight_areas !== undefined &&
    (!Array.isArray(body.oversight_areas) || body.oversight_areas.some((v) => typeof v !== 'string'))
  ) {
    return NextResponse.json({ error: 'oversight_areas must be a string[]' }, { status: 400 })
  }

  if (
    body.score_threshold !== undefined &&
    (!Number.isFinite(body.score_threshold) || body.score_threshold < 0 || body.score_threshold > 1350)
  ) {
    return NextResponse.json({ error: 'score_threshold must be a number between 0 and 1350' }, { status: 400 })
  }

  if (
    body.scoring_weights !== undefined &&
    (typeof body.scoring_weights !== 'object' || body.scoring_weights === null)
  ) {
    return NextResponse.json({ error: 'scoring_weights must be an object' }, { status: 400 })
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
