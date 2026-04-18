import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.FLASHSMS_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'FLASHSMS_API_KEY is not set' }, { status: 500 })
  }

  try {
    const res = await fetch('https://app.flashsms.africa/api/v1/balance', {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    })
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
