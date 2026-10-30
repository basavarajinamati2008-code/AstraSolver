// hotspots Edge Function
// Protected endpoint: requires authenticated municipal staff (verified JWT)
// Runs DBSCAN over open reports and returns cluster data for the dashboard

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dbscan } from '../_shared/dbscan.ts'
import { verifyAdminAuth } from '../_shared/auth.ts'
import { CIVIC_CONFIG } from '../_shared/config.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    // ── Verify Authenticated Municipal Admin ──────────────────────────────
    const auth = await verifyAdminAuth(req)
    if (!auth.authenticated) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: Municipal staff authentication required to access hotspot geospatial data.',
          details: auth.error,
        }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Fetch all open (non-resolved) reports
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, latitude, longitude, category, user_category, priority_score, location_text, status')
      .neq('status', 'Resolved')

    if (error) throw new Error(error.message)
    if (!reports || reports.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    // Prepare points for DBSCAN
    const points = reports.map(r => ({
      id:             r.id,
      latitude:       r.latitude,
      longitude:      r.longitude,
      category:       r.category || r.user_category || 'Other',
      priority_score: r.priority_score,
      location_text:  r.location_text,
      status:         r.status,
    }))

    // Run DBSCAN using unified configuration parameters
    const clusters = dbscan(points, CIVIC_CONFIG.DBSCAN_CONFIG.epsMeters, CIVIC_CONFIG.DBSCAN_CONFIG.minPts)

    // Strip raw point IDs (don't expose internal row IDs to frontend)
    const response = clusters.map(({ points: _pts, ...rest }) => rest)

    return new Response(JSON.stringify(response), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('hotspots error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
