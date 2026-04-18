import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAuthClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {
          // Route handlers here are read-only for auth cookies.
        },
      },
    }
  )
}

export async function getApiUser(req: NextRequest): Promise<User | null> {
  const supabase = getAuthClient(req)
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

export async function requireApiUser(
  req: NextRequest
): Promise<{ user?: User; response?: NextResponse }> {
  const user = await getApiUser(req)
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user }
}
