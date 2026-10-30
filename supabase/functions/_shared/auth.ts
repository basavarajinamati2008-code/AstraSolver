// Shared JWT verification helper for Supabase Edge Functions
// Validates incoming Authorization: Bearer <token> against Supabase Auth

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthVerification {
  authenticated: boolean
  userId?: string
  email?: string
  role?: string
  error?: string
}

export async function verifyAdminAuth(req: Request): Promise<AuthVerification> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' }
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { authenticated: false, error: 'Empty bearer token' }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey) {
    return { authenticated: false, error: 'Supabase URL or Key not configured in runtime environment' }
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  })

  const { data: { user }, error } = await authClient.auth.getUser(token)

  if (error || !user) {
    return {
      authenticated: false,
      error: error?.message || 'Invalid or expired authentication token',
    }
  }

  return {
    authenticated: true,
    userId: user.id,
    email: user.email,
    role: user.role || 'authenticated',
  }
}
