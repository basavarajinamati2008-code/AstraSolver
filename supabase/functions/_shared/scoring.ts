// Priority scoring logic powered by CIVIC_CONFIG

import { CIVIC_CONFIG, type PriorityLevel, type RiskDimension } from './config.ts'

export type RiskLevel = RiskDimension

export interface PriorityBreakdown {
  safety:   number
  impact:   number
  urgency:  number
  affected: number
  total:    number
}

export interface PriorityResult {
  priority_score:       number
  priority_level:       PriorityLevel
  priority_breakdown:   PriorityBreakdown
  priority_explanation: string
}

function affectedPoints(count: number): number {
  for (const tier of CIVIC_CONFIG.PRIORITY_WEIGHTS.affectedTiers) {
    if (count >= tier.minCount) return tier.points
  }
  return 3
}

function levelFromScore(score: number): PriorityLevel {
  const t = CIVIC_CONFIG.PRIORITY_LEVEL_THRESHOLDS
  if (score >= t.Critical) return 'Critical'
  if (score >= t.High) return 'High'
  if (score >= t.Medium) return 'Medium'
  return 'Low'
}

export function computePriority(
  safetyRisk:   RiskLevel,
  publicImpact: RiskLevel,
  urgency:      RiskLevel,
  affectedCount: number
): PriorityResult {
  const safety = CIVIC_CONFIG.PRIORITY_WEIGHTS.safety[safetyRisk]
  const impact = CIVIC_CONFIG.PRIORITY_WEIGHTS.impact[publicImpact]
  const urg    = CIVIC_CONFIG.PRIORITY_WEIGHTS.urgency[urgency]
  const aff    = affectedPoints(affectedCount)
  const total  = Math.min(100, safety + impact + urg + aff)
  const level  = levelFromScore(total)

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
