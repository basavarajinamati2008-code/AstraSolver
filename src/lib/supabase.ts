import { createClient } from '@supabase/supabase-js'

// These VITE_ env variables are safe — they are the public anon key only.
// The service-role key is used only in Edge Functions (server-side).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal in dev: show a warning instead of crashing
  console.warn(
    '[CivicPulse] Supabase env vars missing. ' +
    'Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
