import { NextResponse } from 'next/server'
import { getBalance } from '@/lib/sms'

export async function GET() {
  const result = await getBalance()
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ balance: result.balance, accountName: result.accountName })
}
