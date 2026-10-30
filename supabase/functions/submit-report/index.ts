// submit-report Edge Function
// Handles: input validation → DB insert → Gemini AI → duplicate detection → scoring → return

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

import { detectDuplicate } from '../_shared/duplicates.ts'
import { computePriority } from '../_shared/scoring.ts'
import { haversine } from '../_shared/haversine.ts'

// ── Gemini model constant — update here if the recommended model changes ───────
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// ── CORS headers ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Categories whitelist ──────────────────────────────────────────────────────
const ALLOWED_CATEGORIES = [
  'Road Damage',
  'Waterlogging',
  'Garbage',
  'Streetlight',
  'Water Supply',
  'Drainage',
  'Public Safety',
  'Other',
] as const

// ── In-Memory Sliding Window Rate Limiter ────────────────────────────────────
// Limits anonymous abuse: Max 10 submissions per 5-minute window per IP
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000
const MAX_SUBMISSIONS_PER_WINDOW = 10
const ipSubmissions = new Map<string, number[]>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const timestamps = (ipSubmissions.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)

  if (timestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    const oldest = timestamps[0]
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) }
  }

  timestamps.push(now)
  ipSubmissions.set(ip, timestamps)
  return { allowed: true }
}

// ── Input validation schema ───────────────────────────────────────────────────
const InputSchema = z.object({
  description:    z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description exceeds 2000 characters limit'),
  user_category:  z.enum(ALLOWED_CATEGORIES, { errorMap: () => ({ message: 'Invalid category selected' }) }),
  latitude:       z.number().min(-90).max(90),
  longitude:      z.number().min(-180).max(180),
  location_text:  z.string().max(200, 'Landmark text exceeds 200 characters limit').optional().nullable(),
  affected_count: z.number().int().min(1).max(5000).default(1),
  image_url:      z.string().url().max(1000).optional().nullable().refine(url => {
    if (!url) return true
    const cleanUrl = url.split('?')[0].toLowerCase()
    return cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.png') || cleanUrl.endsWith('.webp') || url.includes('/report-images/')
  }, { message: 'Image must be JPEG, PNG, or WebP format' }),
})

// ── AI response validation schema ─────────────────────────────────────────────
const AiResponseSchema = z.object({
  category:           z.string(),
  summary:            z.string().max(200),
  safety_risk:        z.enum(['Low', 'Medium', 'High']),
  urgency:            z.enum(['Low', 'Medium', 'High']),
  public_impact:      z.enum(['Low', 'Medium', 'High']),
  recommended_action: z.string(),
  keywords:           z.array(z.string()).min(1).max(10),
})

type AiResponse = z.infer<typeof AiResponseSchema>

// ── Generate complaint code ──────────────────────────────────────────────────
function formatCode(seq: number): string {
  return `CIV-${String(seq).padStart(5, '0')}`
}

// ── Call Gemini API ──────────────────────────────────────────────────────────
async function callGemini(description: string, userCategory: string): Promise<AiResponse | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY secret not configured')

  const categories = ['Road Damage', 'Waterlogging', 'Garbage', 'Streetlight', 'Water Supply', 'Drainage', 'Public Safety', 'Other']

  const prompt = `You analyse civic complaints for a municipality. Return JSON only matching the schema.
Categories: ${categories.join(', ')}.
Rate safety_risk, urgency, public_impact as Low/Medium/High based strictly on the text. Do not invent details.

Citizen's category selection: ${userCategory}
Complaint: "${description}"

Return ONLY a JSON object with these exact fields:
{
  "category": "one of the 8 categories above",
  "summary": "max 30 words summary",
  "safety_risk": "Low|Medium|High",
  "urgency": "Low|Medium|High",
  "public_impact": "Low|Medium|High",
  "recommended_action": "brief recommended action",
  "keywords": ["3 to 6 keywords"]
}`

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     0.1,   // low temp for consistent structured output
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`)
  }

  const geminiData = await response.json()
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Gemini returned empty response')

  // Parse JSON — Gemini with responseMimeType=json should return clean JSON
  const parsed = JSON.parse(rawText)
  return AiResponseSchema.parse(parsed)
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // ── 0. Abuse & Rate Limiting Check ──────────────────────────────────────
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('cf-connecting-ip') ||
                     'anonymous-client'
    const rateCheck = checkRateLimit(clientIp)
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Too many complaints submitted from this address.',
          retry_after_seconds: rateCheck.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retryAfterSeconds),
          },
        }
      )
    }

    // ── 1. Parse and validate input ─────────────────────────────────────────
    const body = await req.json()
    const parseResult = InputSchema.safeParse(body)
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.flatten() }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }
    const input = parseResult.data

    // ── 2. Create Supabase client with service role (bypasses RLS) ──────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // ── 3. Generate unique complaint code from sequence ───────────────────
    const { data: seqData, error: seqError } = await supabase
      .rpc('nextval', { sequence_name: 'complaint_code_seq' })
    
    let seqNum: number
    if (seqError || seqData === null) {
      // Fallback: count existing reports + 1
      const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
      seqNum = (count || 0) + 1
    } else {
      seqNum = Number(seqData)
    }
    const complaintCode = formatCode(seqNum)

    // ── 4. Insert report (pending AI status) ─────────────────────────────
    const { data: newReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        complaint_code: complaintCode,
        description:    input.description,
        user_category:  input.user_category,
        latitude:       input.latitude,
        longitude:      input.longitude,
        location_text:  input.location_text,
        affected_count: input.affected_count,
        image_url:      input.image_url,
        ai_status:      'pending',
        status:         'Submitted',
      })
      .select()
      .single()

    if (insertError || !newReport) {
      throw new Error(`DB insert failed: ${insertError?.message}`)
    }

    // ── 5. Insert initial report_updates row ─────────────────────────────
    await supabase.from('report_updates').insert({
      report_id:   newReport.id,
      old_status:  null,
      new_status:  'Submitted',
      action_note: 'Complaint received and registered.',
      updated_by:  'system',
    })

    // ── 6. Call Gemini AI ────────────────────────────────────────────────
    let aiResult: AiResponse | null = null
    let aiError: string | null = null

    try {
      aiResult = await callGemini(input.description, input.user_category)
    } catch (err) {
      aiError = err instanceof Error ? err.message : String(err)
      console.error('Gemini failed:', aiError)
    }

    // ── 7. Fetch candidates for duplicate detection ───────────────────────
    // Last 30 days, open (non-resolved), within 500m (rough bounding box)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const lat = input.latitude
    const lng = input.longitude
    const degOffset = 500 / 111000  // ~500m in degrees (rough, good enough for filtering)

    const { data: candidates } = await supabase
      .from('reports')
      .select('id, description, category, user_category, latitude, longitude, duplicate_of')
      .neq('id', newReport.id)
      .neq('status', 'Resolved')
      .gte('created_at', thirtyDaysAgo)
      .gte('latitude',  lat - degOffset)
      .lte('latitude',  lat + degOffset)
      .gte('longitude', lng - degOffset)
      .lte('longitude', lng + degOffset)

    // ── 8. Duplicate detection ────────────────────────────────────────────
    const category = aiResult?.category || input.user_category
    const dupResult = detectDuplicate(
      {
        id:          newReport.id,
        description: input.description,
        category,
        latitude:    input.latitude,
        longitude:   input.longitude,
      },
      (candidates || []).map(c => ({
        id:           c.id,
        description:  c.description,
        category:     c.category || c.user_category,
        latitude:     c.latitude,
        longitude:    c.longitude,
        duplicate_of: c.duplicate_of,
      }))
    )

    // ── 9. Priority scoring ───────────────────────────────────────────────
    // Count linked duplicates for affected_count calculation
    const { count: linkedDups } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('duplicate_of', dupResult.duplicate_of || newReport.id)

    const totalAffected = Math.max(
      input.affected_count,
      1 + (linkedDups || 0)
    )

    let priorityData = null
    if (aiResult) {
      priorityData = computePriority(
        aiResult.safety_risk,
        aiResult.public_impact,
        aiResult.urgency,
        totalAffected
      )
    }

    // ── 10. Save AI fields and duplicate/priority data ────────────────────
    const updatePayload: Record<string, unknown> = {
      duplicate_of:         dupResult.duplicate_of,
      duplicate_confidence: dupResult.confidence,
      duplicate_reason:     dupResult.reason,
    }

    if (aiResult) {
      Object.assign(updatePayload, {
        category:           aiResult.category,
        ai_summary:         aiResult.summary,
        safety_risk:        aiResult.safety_risk,
        urgency:            aiResult.urgency,
        public_impact:      aiResult.public_impact,
        keywords:           aiResult.keywords,
        recommended_action: aiResult.recommended_action,
        ai_status:          'success',
      })
    } else {
      Object.assign(updatePayload, {
        ai_status: 'failed',
        ai_error:  aiError,
      })
    }

    if (priorityData) {
      Object.assign(updatePayload, {
        priority_score:       priorityData.priority_score,
        priority_level:       priorityData.priority_level,
        priority_breakdown:   priorityData.priority_breakdown,
        priority_explanation: priorityData.priority_explanation,
      })
    }

    await supabase.from('reports').update(updatePayload).eq('id', newReport.id)

    // ── 11. Recompute primary's priority if this is a duplicate ──────────
    if (dupResult.duplicate_of && aiResult) {
      const { data: primary } = await supabase
        .from('reports')
        .select('*')
        .eq('id', dupResult.duplicate_of)
        .single()

      if (primary?.safety_risk && primary?.public_impact && primary?.urgency) {
        const { count: primaryDups } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('duplicate_of', primary.id)

        const primaryAffected = Math.max(
          primary.affected_count || 1,
          1 + (primaryDups || 0)
        )
        const newPriority = computePriority(
          primary.safety_risk,
          primary.public_impact,
          primary.urgency,
          primaryAffected
        )
        await supabase.from('reports').update({
          priority_score:       newPriority.priority_score,
          priority_level:       newPriority.priority_level,
          priority_breakdown:   newPriority.priority_breakdown,
          priority_explanation: newPriority.priority_explanation,
        }).eq('id', primary.id)
      }
    }

    // ── 12. Return response ───────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        complaint_code:       complaintCode,
        category:             aiResult?.category ?? null,
        summary:              aiResult?.summary ?? null,
        priority_score:       priorityData?.priority_score ?? null,
        priority_level:       priorityData?.priority_level ?? null,
        ai_status:            aiResult ? 'success' : 'failed',
        duplicate_of:         dupResult.duplicate_of,
        duplicate_confidence: dupResult.confidence,
        duplicate_reason:     dupResult.reason,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('submit-report error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
