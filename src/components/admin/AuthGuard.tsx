// Auth guard — wraps admin pages, redirects to /admin/login if not authenticated
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Skeleton } from '@/components/ui/skeleton'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Get current session immediately
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // undefined = still loading
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-civic-bg flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  // null = no session → redirect to login
  if (session === null) {
    return <Navigate to="/admin/login" replace />
  }

  // Authenticated → render children
  return <>{children}</>
}
