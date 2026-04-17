import { createClient } from '@supabase/supabase-js'

// Lazily-initialized browser client (anon key + RLS)
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

// Backwards-compat named export used in client components
export const supabase = {
  auth: {
    signInWithPassword: (opts: Parameters<ReturnType<typeof createClient>['auth']['signInWithPassword']>[0]) =>
      getSupabase().auth.signInWithPassword(opts),
    signOut: () => getSupabase().auth.signOut(),
  },
}
