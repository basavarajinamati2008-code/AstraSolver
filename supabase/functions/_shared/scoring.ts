// Priority scoring logic
// safety:   High→40, Medium→22, Low→8
// impact:   High→25, Medium→14, Low→5
// urgency:  High→20, Medium→11, Low→4
// affected: 1→3, 2-3→7, 4-6→11, 7+→15
// total clamped to 0–100
// Level: 0-24 Low, 25-49 Medium, 50-74 High, 75-100 Critical

export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface PriorityBreakdown {
  safety:   number
  impact:   number
  urgency:  number
  affected: number
  total:    number
}

export interface PriorityResult {
  priority_score:       number
  priority_level:       'Low' | 'Medium' | 'High' | 'Critical'
  priority_breakdown:   PriorityBreakdown
  priority_explanation: string
}

const SAFETY_POINTS: Record<RiskLevel, number> = { High: 40, Medium: 22, Low: 8 }
const IMPACT_POINTS: Record<RiskLevel, number> = { High: 25, Medium: 14, Low: 5 }
const URGENCY_POINTS: Record<RiskLevel, number> = { High: 20, Medium: 11, Low: 4 }

function affectedPoints(count: number): number {
  if (count >= 7) return 15
  if (count >= 4) return 11
  if (count >= 2) return 7
  return 3
}

function levelFromScore(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 75) return 'Critical'
  if (score >= 50) return 'High'
  if (score >= 25) return 'Medium'
  return 'Low'
}

export function computePriority(
  safetyRisk:   RiskLevel,
  publicImpact: RiskLevel,
  urgency:      RiskLevel,
  affectedCount: number
): PriorityResult {
  const safety   = SAFETY_POINTS[safetyRisk]
  const impact   = IMPACT_POINTS[publicImpact]
  const urg      = URGENCY_POINTS[urgency]
  const aff      = affectedPoints(affectedCount)
  const total    = Math.min(100, safety + impact + urg + aff)
  const level    = levelFromScore(total)

  const breakdown: PriorityBreakdown = { safety, impact: impact, urgency: urg, affected: aff, total }

  // Human-readable explanation bullets
  const bullets = [
    `• Safety risk (${safetyRisk}): ${safety} points`,
    `• Public impact (${publicImpact}): ${impact} points`,
    `• Urgency (${urgency}): ${urg} points`,
    `• Affected citizens (${affectedCount}): ${aff} points`,
    `• Total priority score: ${total}/100 → ${level}`,
    `AI-assisted recommendation — verify before action.`,
  ]

  return {
    priority_score:       total,
    priority_level:       level,
    priority_breakdown:   breakdown,
    priority_explanation: bullets.join('\n'),
  }
}
