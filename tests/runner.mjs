// Pure JS/Node test runner for shared algorithms
// Validates: haversine, tfidf, duplicates, scoring, dbscan
// Matches the exact logic in supabase/functions/_shared/*.ts

import assert from 'node:assert/strict'
import test, { describe, it } from 'node:test'

// ── 1. Haversine ────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// ── 2. TF-IDF & Cosine ──────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'this', 'that', 'there',
  'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'not', 'no',
  'very', 'also', 'as', 'so', 'than', 'then', 'when', 'where', 'which',
  'who', 'how', 'what', 'near', 'around', 'about', 'please', 'road', 'street',
])

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w))
}

function tf(tokens) {
  const counts = new Map()
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1)
  const total = tokens.length || 1
  const result = new Map()
  for (const [t, c] of counts) result.set(t, c / total)
  return result
}

function idf(corpus) {
  const df = new Map()
  for (const doc of corpus) {
    const seen = new Set(doc)
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const N = corpus.length
  const result = new Map()
  for (const [t, d] of df) result.set(t, Math.log((N + 1) / (d + 1)) + 1)
  return result
}

function tfidfVector(tokens, idfMap) {
  const tfMap = tf(tokens)
  const vec = new Map()
  for (const [t, tfVal] of tfMap) {
    vec.set(t, tfVal * (idfMap.get(t) ?? 1))
  }
  return vec
}

function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (const [t, va] of a) {
    dot += va * (b.get(t) ?? 0)
    normA += va * va
  }
  for (const [, vb] of b) normB += vb * vb
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function textSimilarity(a, b) {
  const tA = tokenise(a)
  const tB = tokenise(b)
  if (tA.length === 0 && tB.length === 0) return 1
  if (tA.length === 0 || tB.length === 0) return 0
  const idfMap = idf([tA, tB])
  const vA = tfidfVector(tA, idfMap)
  const vB = tfidfVector(tB, idfMap)
  return cosine(vA, vB)
}

// ── 3. Duplicate Detection ──────────────────────────────────────────────────
function findPrimary(candidates, id) {
  let current = id
  const visited = new Set()
  while (true) {
    if (visited.has(current)) break
    visited.add(current)
    const node = candidates.find(c => c.id === current)
    if (!node?.duplicate_of) break
    current = node.duplicate_of
  }
  return current
}

function detectDuplicate(newReport, candidates) {
  let bestId = null
  let bestScore = 0
  let bestDist = 0
  let bestSimilarity = 0
  let bestCandidateCategory = ''

  for (const c of candidates) {
    if (c.id === newReport.id) continue
    const dist = haversine(newReport.latitude, newReport.longitude, c.latitude, c.longitude)
    if (dist > 500) continue

    const cosineSim = textSimilarity(newReport.description, c.description)
    const catMatch = (c.category || '') === newReport.category ? 1 : 0
    const distScore = Math.max(0, 1 - dist / 300)

    const confidence = 0.45 * cosineSim + 0.20 * catMatch + 0.35 * distScore

    if (confidence > bestScore) {
      bestScore = confidence
      bestId = c.id
      bestDist = dist
      bestSimilarity = cosineSim
      bestCandidateCategory = c.category || newReport.category
    }
  }

  if (bestScore < 0.70 || !bestId) {
    return { duplicate_of: null, confidence: null, reason: null }
  }

  const primaryId = findPrimary(candidates, bestId)
  const distStr = bestDist < 1000 ? `${Math.round(bestDist)} m` : `${(bestDist / 1000).toFixed(2)} km`
  const simPct = Math.round(bestSimilarity * 100)
  const catStr = bestCandidateCategory === newReport.category
    ? `Same category (${newReport.category})`
    : `Different categories`
  const reason = `${catStr}, ${distStr} apart, ${simPct}% text similarity`

  return {
    duplicate_of: primaryId,
    confidence: Math.round(bestScore * 1000) / 1000,
    reason,
  }
}

// ── 4. Priority Scoring ─────────────────────────────────────────────────────
const SAFETY_POINTS = { High: 40, Medium: 22, Low: 8 }
const IMPACT_POINTS = { High: 25, Medium: 14, Low: 5 }
const URGENCY_POINTS = { High: 20, Medium: 11, Low: 4 }

function affectedPoints(count) {
  if (count >= 7) return 15
  if (count >= 4) return 11
  if (count >= 2) return 7
  return 3
}

function levelFromScore(score) {
  if (score >= 75) return 'Critical'
  if (score >= 50) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

function computePriority(safetyRisk, publicImpact, urgency, affectedCount) {
  const safety = SAFETY_POINTS[safetyRisk]
  const impact = IMPACT_POINTS[publicImpact]
  const urg = URGENCY_POINTS[urgency]
  const aff = affectedPoints(affectedCount)
  const total = Math.min(100, safety + impact + urg + aff)
  const level = levelFromScore(total)

  const breakdown = { safety, impact, urgency: urg, affected: aff, total }

  const bullets = [
    `• Safety risk (${safetyRisk}): ${safety} points`,
    `• Public impact (${publicImpact}): ${impact} points`,
    `• Urgency (${urgency}): ${urg} points`,
    `• Affected citizens (${affectedCount}): ${aff} points`,
    `• Total priority score: ${total}/100 → ${level}`,
    `AI-assisted recommendation — verify before action.`,
  ]

  return {
    priority_score: total,
    priority_level: level,
    priority_breakdown: breakdown,
    priority_explanation: bullets.join('\n'),
  }
}

// ── 5. DBSCAN Clustering ────────────────────────────────────────────────────
const NOISE = -1

function dbscan(points, eps, minPts) {
  const n = points.length
  const labels = new Array(n).fill(NOISE)
  let clusterId = 0

  function rangeQuery(idx) {
    return points.reduce((acc, _, j) => {
      if (haversine(
        points[idx].latitude, points[idx].longitude,
        points[j].latitude, points[j].longitude
      ) <= eps) acc.push(j)
      return acc
    }, [])
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== NOISE) continue

    const neighbours = rangeQuery(i)
    if (neighbours.length < minPts) continue

    labels[i] = clusterId
    const queue = [...neighbours.filter(j => j !== i)]

    let qi = 0
    while (qi < queue.length) {
      const j = queue[qi++]
      if (labels[j] === NOISE) {
        labels[j] = clusterId
        const jNeighbours = rangeQuery(j)
        if (jNeighbours.length >= minPts) {
          queue.push(...jNeighbours.filter(k => labels[k] === NOISE && !queue.includes(k)))
        }
      } else if (labels[j] < 0) {
        labels[j] = clusterId
      }
    }
    clusterId++
  }

  const clusters = []
  for (let cid = 0; cid < clusterId; cid++) {
    const pts = points.filter((_, i) => labels[i] === cid)
    if (pts.length < minPts) continue

    const lat = pts.reduce((s, p) => s + p.latitude, 0) / pts.length
    const lng = pts.reduce((s, p) => s + p.longitude, 0) / pts.length
    const radius = Math.max(...pts.map(p => haversine(lat, lng, p.latitude, p.longitude)))

    const catCounts = {}
    pts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1 })
    const dominant = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0]

    const scored = pts.filter(p => p.priority_score !== null)
    const avgPrio = scored.length
      ? scored.reduce((s, p) => s + (p.priority_score ?? 0), 0) / scored.length
      : 0

    const locCounts = {}
    pts.forEach(p => { if (p.location_text) locCounts[p.location_text] = (locCounts[p.location_text] || 0) + 1 })
    const label = Object.keys(locCounts).length
      ? Object.entries(locCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null

    clusters.push({
      id: cid,
      points: pts,
      centre_lat: lat,
      centre_lng: lng,
      radius_m: radius,
      count: pts.length,
      dominant_category: dominant,
      category_counts: catCounts,
      avg_priority: avgPrio,
      label,
      wording: 'Possible infrastructure issue, inspection recommended',
    })
  }

  return clusters.sort((a, b) => b.count - a.count)
}

// ── Test Suites ─────────────────────────────────────────────────────────────
console.log('🧪 Starting CivicPulse AI pure logic test suite...\n')

// Suite 1: Haversine
describe('haversine tests', () => {
  it('returns 0 for identical points', () => {
    assert.equal(haversine(12.97, 77.59, 12.97, 77.59), 0)
  })

  it('~111km per degree latitude at equator', () => {
    const dist = haversine(0, 0, 1, 0)
    assert.ok(dist > 110000 && dist < 112000, `Expected ~111km, got ${dist}`)
  })

  it('calculates expected distance for ~150m offset', () => {
    const dist = haversine(12.9716, 77.5946, 12.9730, 77.5946)
    assert.ok(dist > 140 && dist < 170, `Expected ~155m, got ${dist}`)
  })
})

// Suite 2: TF-IDF
describe('tfidf tests', () => {
  it('tokenises and filters stopwords correctly', () => {
    const tokens = tokenise('The large dangerous pothole is on the road.')
    assert.ok(tokens.includes('pothole'))
    assert.ok(tokens.includes('dangerous'))
    assert.ok(!tokens.includes('the'))
    assert.ok(!tokens.includes('is'))
    assert.ok(!tokens.includes('on'))
  })

  it('gives 1.0 for identical sentences', () => {
    const sim = textSimilarity('large pothole on main road', 'large pothole on main road')
    assert.ok(Math.abs(sim - 1.0) < 0.001)
  })

  it('gives low similarity for unrelated topics', () => {
    const sim = textSimilarity('flooded drain sewer overflow', 'streetlight bulb broken wires')
    assert.ok(sim < 0.25, `Expected low similarity, got ${sim}`)
  })

  it('gives high similarity for semantic rephrasings', () => {
    const sim = textSimilarity(
      'deep pothole near central bus stand causing accidents',
      'crater pothole near bus stand vehicle damage'
    )
    assert.ok(sim >= 0.30, `Expected moderate/high similarity (>= 0.30), got ${sim}`)
  })
})

// Suite 3: Duplicate Detection
describe('duplicate detection tests', () => {
  const base = {
    id: 'rep-new',
    description: 'Deep dangerous pothole near central bus stand entrance causing bike accidents',
    category: 'Road Damage',
    latitude: 12.9716,
    longitude: 77.5946,
  }

  it('flags close, high-similarity, same-category complaint as duplicate (confidence >= 0.70)', () => {
    const candidates = [{
      id: 'rep-existing-1',
      description: 'Severe pothole at bus stand gate causing motorcycle accidents',
      category: 'Road Damage',
      latitude: 12.9717,
      longitude: 77.5946,
      duplicate_of: null,
    }]
    const res = detectDuplicate(base, candidates)
    assert.equal(res.duplicate_of, 'rep-existing-1')
    assert.ok(res.confidence >= 0.70, `Expected confidence >= 0.70, got ${res.confidence}`)
    assert.ok(res.reason.includes('Same category (Road Damage)'))
  })

  it('does NOT flag distant complaint as duplicate even if description matches', () => {
    const candidates = [{
      id: 'rep-far',
      description: 'Deep dangerous pothole near central bus stand entrance causing bike accidents',
      category: 'Road Damage',
      latitude: 13.05, // ~8.7 km away
      longitude: 77.59,
      duplicate_of: null,
    }]
    const res = detectDuplicate(base, candidates)
    assert.equal(res.duplicate_of, null)
  })

  it('follows duplicate chain to return the root primary', () => {
    const candidates = [
      {
        id: 'primary-root',
        description: 'Pothole at bus stand entrance',
        category: 'Road Damage',
        latitude: 12.97165,
        longitude: 77.59465,
        duplicate_of: null,
      },
      {
        id: 'intermediate-dup',
        description: 'Pothole near bus stand gate',
        category: 'Road Damage',
        latitude: 12.97168,
        longitude: 77.59466,
        duplicate_of: 'primary-root',
      },
    ]
    const res = detectDuplicate(base, candidates)
    assert.equal(res.duplicate_of, 'primary-root')
  })
})

// Suite 4: Priority Scoring
describe('priority scoring tests', () => {
  it('High + High + High + 10 affected = 100 Critical', () => {
    const p = computePriority('High', 'High', 'High', 10)
    assert.equal(p.priority_level, 'Critical')
    assert.equal(p.priority_score, 100)
    assert.equal(p.priority_breakdown.safety, 40)
    assert.equal(p.priority_breakdown.impact, 25)
    assert.equal(p.priority_breakdown.urgency, 20)
    assert.equal(p.priority_breakdown.affected, 15)
  })

  it('Low + Low + Low + 1 affected = 20 Low', () => {
    const p = computePriority('Low', 'Low', 'Low', 1)
    assert.equal(p.priority_level, 'Low')
    assert.equal(p.priority_score, 20)
  })

  it('Includes required disclaimer in explanation', () => {
    const p = computePriority('Medium', 'Medium', 'Medium', 2)
    assert.ok(p.priority_explanation.includes('AI-assisted recommendation — verify before action.'))
  })
})

// Suite 5: DBSCAN Clustering
describe('dbscan clustering tests', () => {
  const points = [
    { id: '1', latitude: 12.9716, longitude: 77.5946, category: 'Road Damage', priority_score: 90, location_text: 'Bus Stand', status: 'Submitted' },
    { id: '2', latitude: 12.9717, longitude: 77.5947, category: 'Road Damage', priority_score: 85, location_text: 'Bus Stand', status: 'Submitted' },
    { id: '3', latitude: 12.9715, longitude: 77.5945, category: 'Waterlogging', priority_score: 95, location_text: 'Bus Stand', status: 'Submitted' },
    { id: 'isolated', latitude: 13.05, longitude: 77.50, category: 'Garbage', priority_score: 30, location_text: 'Outskirts', status: 'Submitted' },
  ]

  it('detects cluster of 3 points within 250m and ignores isolated noise point', () => {
    const clusters = dbscan(points, 250, 3)
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0].count, 3)
    assert.equal(clusters[0].dominant_category, 'Road Damage')
    assert.equal(clusters[0].label, 'Bus Stand')
    assert.equal(clusters[0].wording, 'Possible infrastructure issue, inspection recommended')
  })
})
