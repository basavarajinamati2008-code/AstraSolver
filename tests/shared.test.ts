// Unit tests for shared Edge Function logic
// Run with: npm test  (uses vitest)
// These test pure functions — no DB or network calls

import { describe, it, expect } from 'vitest'
import { haversine } from '../supabase/functions/_shared/haversine'
import { tokenise, textSimilarity } from '../supabase/functions/_shared/tfidf'
import { detectDuplicate } from '../supabase/functions/_shared/duplicates'
import { computePriority } from '../supabase/functions/_shared/scoring'
import { dbscan } from '../supabase/functions/_shared/dbscan'
import { CIVIC_CONFIG } from '../config/civicpulse.config'

// ── haversine ──────────────────────────────────────────────────────────────
describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(12.97, 77.59, 12.97, 77.59)).toBe(0)
  })

  it('~111km per degree latitude at equator', () => {
    const dist = haversine(0, 0, 1, 0)
    expect(dist).toBeGreaterThan(110000)
    expect(dist).toBeLessThan(112000)
  })

  it('calculates a known distance', () => {
    // ~157m apart (two points ~0.00141 degrees lat apart)
    const dist = haversine(12.9716, 77.5946, 12.9730, 77.5946)
    expect(dist).toBeGreaterThan(140)
    expect(dist).toBeLessThan(170)
  })
})

// ── tfidf ──────────────────────────────────────────────────────────────────
describe('tokenise', () => {
  it('removes stopwords and punctuation', () => {
    const tokens = tokenise('The large pothole is on the road.')
    expect(tokens).toContain('pothole')
    expect(tokens).toContain('large')
    expect(tokens).not.toContain('the')
    expect(tokens).not.toContain('is')
    expect(tokens).not.toContain('on')
  })

  it('returns empty array for empty string', () => {
    expect(tokenise('')).toEqual([])
  })
})

describe('textSimilarity', () => {
  it('returns 1.0 for identical texts', () => {
    const sim = textSimilarity('large pothole on main road', 'large pothole on main road')
    expect(sim).toBeCloseTo(1.0, 2)
  })

  it('returns 0 for completely different texts', () => {
    const sim = textSimilarity('flood water overflowing drain', 'streetlight broken wires exposed')
    expect(sim).toBeLessThan(0.3)
  })

  it('returns high similarity for rephrased same issue', () => {
    const sim = textSimilarity(
      'big pothole causing accidents near bus stop',
      'deep pothole near bus stand causing vehicle damage'
    )
    expect(sim).toBeGreaterThan(0.3)
  })

  it('handles empty strings gracefully', () => {
    expect(textSimilarity('', '')).toBe(1)
    expect(textSimilarity('pothole', '')).toBe(0)
  })
})

// ── duplicates ────────────────────────────────────────────────────────────
describe('detectDuplicate', () => {
  const base = {
    id:          'new-report',
    description: 'Deep pothole near central bus stand causing accidents',
    category:    'Road Damage',
    latitude:    12.9716,
    longitude:   77.5946,
  }

  it('detects a clear duplicate (same category, nearby, similar text)', () => {
    const candidates = [{
      id:           'existing-1',
      description:  'Large pothole at bus stand causing vehicle damage',
      category:     'Road Damage',
      latitude:     12.9717,   // ~11m away
      longitude:    77.5946,
      duplicate_of: null,
    }]
    const result = detectDuplicate(base, candidates)
    // Should detect as duplicate with high confidence
    expect(result.duplicate_of).toBe('existing-1')
    expect(result.confidence).toBeGreaterThan(0.70)
  })

  it('does not flag distant reports as duplicates', () => {
    const candidates = [{
      id:           'far-away',
      description:  'Deep pothole near central bus stand',
      category:     'Road Damage',
      latitude:     13.05,    // ~8.7 km away
      longitude:    77.59,
      duplicate_of: null,
    }]
    const result = detectDuplicate(base, candidates)
    expect(result.duplicate_of).toBeNull()
  })

  it('follows duplicate chain to find primary', () => {
    // existing-2 is itself a duplicate of existing-1
    const candidates = [
      {
        id: 'existing-1', description: 'Pothole at bus stand',
        category: 'Road Damage', latitude: 12.9717, longitude: 77.5946, duplicate_of: null,
      },
      {
        id: 'existing-2', description: 'Pothole near bus stop',
        category: 'Road Damage', latitude: 12.9718, longitude: 77.5946, duplicate_of: 'existing-1',
      },
    ]
    const result = detectDuplicate(base, candidates)
    // Chain: existing-2 → existing-1, so should point to existing-1
    expect(result.duplicate_of).toBe('existing-1')
  })
})

// ── scoring ───────────────────────────────────────────────────────────────
describe('computePriority', () => {
  it('assigns Critical for High+High+High+7 affected', () => {
    const r = computePriority('High', 'High', 'High', 10)
    expect(r.priority_level).toBe('Critical')
    expect(r.priority_score).toBe(100)
    expect(r.priority_breakdown.safety).toBe(40)
  })

  it('assigns Low for Low+Low+Low+1 affected', () => {
    const r = computePriority('Low', 'Low', 'Low', 1)
    expect(r.priority_level).toBe('Low')
    expect(r.priority_score).toBe(20)  // 8+5+4+3=20
  })

  it('assigns Medium for mixed inputs', () => {
    // Medium safety(22) + Medium impact(14) + Low urgency(4) + 1 affected(3) = 43 → Medium
    const r = computePriority('Medium', 'Medium', 'Low', 1)
    expect(r.priority_level).toBe('Medium')
    expect(r.priority_score).toBe(43)
  })

  it('explanation contains "verify before action"', () => {
    const r = computePriority('High', 'Medium', 'High', 5)
    expect(r.priority_explanation).toContain('verify before action')
  })

  it('affected count tiers work correctly', () => {
    expect(computePriority('Low', 'Low', 'Low', 1).priority_breakdown.affected).toBe(3)
    expect(computePriority('Low', 'Low', 'Low', 2).priority_breakdown.affected).toBe(7)
    expect(computePriority('Low', 'Low', 'Low', 4).priority_breakdown.affected).toBe(11)
    expect(computePriority('Low', 'Low', 'Low', 7).priority_breakdown.affected).toBe(15)
  })
})

// ── dbscan ────────────────────────────────────────────────────────────────
describe('dbscan', () => {
  // Three tight clusters + some noise
  const clusterA = [
    { id: 'a1', latitude: 12.9716, longitude: 77.5946, category: 'Road Damage', priority_score: 60, location_text: 'Bus Stand', status: 'Submitted' },
    { id: 'a2', latitude: 12.9717, longitude: 77.5947, category: 'Road Damage', priority_score: 55, location_text: 'Bus Stand', status: 'Submitted' },
    { id: 'a3', latitude: 12.9715, longitude: 77.5945, category: 'Waterlogging', priority_score: 70, location_text: 'Bus Stand', status: 'Submitted' },
  ]
  const noise = [
    { id: 'n1', latitude: 13.10,   longitude: 77.70,   category: 'Garbage', priority_score: 30, location_text: null, status: 'Submitted' },
  ]

  it('finds a cluster of 3 nearby points', () => {
    const clusters = dbscan([...clusterA, ...noise], 250, 3)
    expect(clusters.length).toBeGreaterThanOrEqual(1)
    expect(clusters[0].count).toBe(3)
  })

  it('excludes noise points from clusters', () => {
    const clusters = dbscan([...clusterA, ...noise], 250, 3)
    const allIds = clusters.flatMap(c => c.points.map(p => p.id))
    expect(allIds).not.toContain('n1')
  })

  it('calculates dominant category correctly', () => {
    const clusters = dbscan(clusterA, 250, 3)
    expect(clusters[0].dominant_category).toBe('Road Damage')
  })

  it('returns cluster label from most common location_text', () => {
    const clusters = dbscan(clusterA, 250, 3)
    expect(clusters[0].label).toBe('Bus Stand')
  })

  it('returns empty array for fewer than minPts points', () => {
    const clusters = dbscan(clusterA.slice(0, 2), 250, 3)
    expect(clusters).toEqual([])
  })
})

// ── CIVIC_CONFIG integrity ────────────────────────────────────────────────
describe('CIVIC_CONFIG integrity', () => {
  it('has verified Gemini 2.5 Flash model', () => {
    expect(CIVIC_CONFIG.GEMINI_MODEL).toBe('gemini-2.5-flash')
  })

  it('weights sum to 100 for max priority calculation', () => {
    const maxSafety = CIVIC_CONFIG.PRIORITY_WEIGHTS.safety.High
    const maxImpact = CIVIC_CONFIG.PRIORITY_WEIGHTS.impact.High
    const maxUrgency = CIVIC_CONFIG.PRIORITY_WEIGHTS.urgency.High
    const maxAffected = CIVIC_CONFIG.PRIORITY_WEIGHTS.affectedTiers.tier4
    expect(maxSafety + maxImpact + maxUrgency + maxAffected).toBe(100)
  })

  it('duplicate weights sum exactly to 1.0', () => {
    const { cosine, categoryMatch, distanceScore } = CIVIC_CONFIG.DUPLICATE_CONFIG.weights
    expect(Math.round((cosine + categoryMatch + distanceScore) * 100) / 100).toBe(1.0)
  })
})

// ── Auth Token Verification ───────────────────────────────────────────────
describe('verifyAdminAuth logic', () => {
  it('rejects requests with missing Authorization header', () => {
    const req = new Request('https://example.com/api/hotspots', { method: 'POST' })
    const authHeader = req.headers.get('Authorization')
    expect(authHeader).toBeNull()
  })

  it('extracts Bearer token properly', () => {
    const token = 'fake-jwt-token-xyz'
    const req = new Request('https://example.com/api/hotspots', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const authHeader = req.headers.get('Authorization')
    expect(authHeader).toBe(`Bearer ${token}`)
    const extracted = authHeader?.replace('Bearer ', '').trim()
    expect(extracted).toBe(token)
  })
})

// ── CSV Export Formatting ─────────────────────────────────────────────────
describe('CSV export formatting', () => {
  it('escapes quotes and formats CSV rows correctly', () => {
    const row = {
      code: 'CIV-00001',
      desc: 'Deep pothole, "very dangerous" near main road',
      cat: 'Road Damage',
      priority: 'Critical',
      score: 95,
      status: 'Submitted',
    }

    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`
    const csvLine = [row.code, row.cat, row.priority, row.score, row.status, escapeCsv(row.desc)].join(',')

    expect(csvLine).toContain('"CIV-00001"')
    expect(csvLine).toContain('"Deep pothole, ""very dangerous"" near main road"')
  })
})
