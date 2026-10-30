// civic-brief Edge Function
// Protected endpoint: requires authenticated municipal staff (verified JWT)
// Computes stats from DB, sends compact JSON to Gemini, caches result in briefs table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dbscan } from '../_shared/dbscan.ts'
import { verifyAdminAuth } from '../_shared/auth.ts'
import { CIVIC_CONFIG } from '../_shared/config.ts'

const GEMINI_MODEL    = CIVIC_CONFIG.GEMINI_MODEL
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    // ── Verify Authenticated Municipal Admin ──────────────────────────────
    const auth = await verifyAdminAuth(req)
    if (!auth.authenticated) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: Municipal staff authentication required to generate civic briefs.',
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

    // ── Fetch all reports for stats computation ────────────────────────────
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, status, priority_level, category, user_category, keywords, location_text, latitude, longitude, priority_score, created_at')

    if (error) throw new Error(error.message)

    const total    = reports?.length || 0
    const critical = reports?.filter(r => r.priority_level === 'Critical').length || 0
    const open     = reports?.filter(r => r.status !== 'Resolved') || []
    const resolved = reports?.filter(r => r.status === 'Resolved').length || 0

    // Category counts
    const catCounts: Record<string, number> = {}
    for (const r of reports || []) {
      const cat = r.category || r.user_category || 'Other'
      catCounts[cat] = (catCounts[cat] || 0) + 1
    }

    // Keyword frequency (flatten all keyword arrays)
    const keywordCounts: Record<string, number> = {}
    for (const r of reports || []) {
      for (const kw of (r.keywords || [])) {
        const k = kw.toLowerCase()
        keywordCounts[k] = (keywordCounts[k] || 0) + 1
      }
    }
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw, count]) => ({ keyword: kw, count }))

    // Hotspots via DBSCAN
    const points = open.map(r => ({
      id:             r.id,
      latitude:       r.latitude,
      longitude:      r.longitude,
      category:       r.category || r.user_category || 'Other',
      priority_score: r.priority_score,
      location_text:  r.location_text,
      status:         r.status,
    }))
    const clusters = dbscan(points, 250, 3)

    // Build compact stats JSON (do NOT send full report text to Gemini)
    const stats = {
      total_reports:   total,
      critical_count:  critical,
      resolved_count:  resolved,
      open_count:      open.length,
      category_counts: catCounts,
      top_keywords:    topKeywords,
      hotspots:        clusters.map(c => ({
        label:             c.label || `Cluster ${c.id + 1}`,
        count:             c.count,
        dominant_category: c.dominant_category,
        avg_priority:      c.avg_priority.toFixed(1),
        radius_m:          c.radius_m.toFixed(0),
      })),
    }

    // ── Call Gemini with stats only ────────────────────────────────────────
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY secret not configured')

    const prompt = `You are a municipal intelligence analyst. Write a brief that an officer can read in under a minute.
Use ONLY the numbers provided below. Do not invent facts.
Format: Findings as bullet points. One recommended action per hotspot.
End with a "Priority Actions" section.

Data: ${JSON.stringify(stats, null, 2)}`

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      throw new Error(`Gemini error ${geminiRes.status}: ${errText.slice(0, 200)}`)
    }

    const geminiData = await geminiRes.json()
    const briefText  = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!briefText) throw new Error('Gemini returned empty brief')

    // ── Cache in briefs table ──────────────────────────────────────────────
    const { data: savedBrief, error: saveErr } = await supabase
      .from('briefs')
      .insert({
        text:         briefText,
        stats_used:   stats,
        report_count: total,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveErr) console.error('Failed to cache brief:', saveErr)

    const result = {
      id:           savedBrief?.id || 'unsaved',
      text:         briefText,
      stats_used:   stats,
      report_count: total,
      generated_at: savedBrief?.generated_at || new Date().toISOString(),
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('civic-brief error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
