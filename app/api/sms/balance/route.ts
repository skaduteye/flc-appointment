import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req)
  if (auth.response) return auth.response

  const key = process.env.FLASHSMS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'FLASHSMS_API_KEY is not set' }, { status: 500 })
  }

  try {
    const res = await fetch('https://app.flashsms.africa/api/v1/balance', {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const text = await res.text()
      console.error('FlashSMS returned non-JSON:', res.status, text.slice(0, 200))
      return NextResponse.json(
        { error: `FlashSMS returned HTTP ${res.status} (non-JSON)` },
        { status: 502 },
      )
    }

    const json = await res.json()
    if (!json.success) {
      return NextResponse.json({ error: json.error ?? `HTTP ${res.status}` }, { status: 502 })
    }
    return NextResponse.json({ balance: json.data.balance })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    )
  }
}
