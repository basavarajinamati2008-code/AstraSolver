// Duplicate detection logic
// confidence = 0.45*cosine + 0.20*(category equal) + 0.35*max(0,1-dist/300m)
// If best >= 0.70, mark as duplicate of the primary (follow chain)

import { haversine } from './haversine.ts'
import { textSimilarity } from './tfidf.ts'

export interface Candidate {
  id: string
  description: string
  category: string | null
  latitude: number
  longitude: number
  duplicate_of: string | null  // follow chain to find primary
}

export interface DuplicateResult {
  duplicate_of: string | null
  confidence: number | null
  reason: string | null
}

// Follow the duplicate chain to the root (primary) report
function findPrimary(candidates: Candidate[], id: string): string {
  let current = id
  const visited = new Set<string>()
  while (true) {
    if (visited.has(current)) break  // cycle guard
    visited.add(current)
    const node = candidates.find(c => c.id === current)
    if (!node?.duplicate_of) break
    current = node.duplicate_of
  }
  return current
}

export function detectDuplicate(
  newReport: {
    id: string
    description: string
    category: string
    latitude: number
    longitude: number
  },
  candidates: Candidate[]  // pre-filtered: last 30 days, within 500m, excluding self
): DuplicateResult {

  let bestId: string | null = null
  let bestScore = 0
  let bestDist = 0
  let bestSimilarity = 0
  let bestCandidateCategory = ''

  for (const c of candidates) {
    if (c.id === newReport.id) continue  // exclude self

    const dist = haversine(newReport.latitude, newReport.longitude, c.latitude, c.longitude)
    if (dist > 500) continue  // safety guard (pre-filter may miss edge cases)

    const cosineSim = textSimilarity(newReport.description, c.description)
    const catMatch  = (c.category || '') === newReport.category ? 1 : 0
    const distScore = Math.max(0, 1 - dist / 300)

    const confidence = 0.45 * cosineSim + 0.20 * catMatch + 0.35 * distScore

    if (confidence > bestScore) {
      bestScore    = confidence
      bestId       = c.id
      bestDist     = dist
      bestSimilarity = cosineSim
      bestCandidateCategory = c.category || newReport.category
    }
  }

  if (bestScore < 0.70 || !bestId) {
    return { duplicate_of: null, confidence: null, reason: null }
  }

  // Follow chain to the primary report
  const primaryId = findPrimary(candidates, bestId)

  // Build human-readable reason string
  const distStr  = bestDist < 1000 ? `${Math.round(bestDist)} m` : `${(bestDist / 1000).toFixed(2)} km`
  const simPct   = Math.round(bestSimilarity * 100)
  const catStr   = bestCandidateCategory === newReport.category
    ? `Same category (${newReport.category})`
    : `Different categories`
  const reason = `${catStr}, ${distStr} apart, ${simPct}% text similarity`

  return {
    duplicate_of: primaryId,
    confidence:   Math.round(bestScore * 1000) / 1000,  // 3 decimals
    reason,
  }
}
