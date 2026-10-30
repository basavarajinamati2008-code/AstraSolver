// Test script for submit-report pipeline & failure state handling
// Tests 3 realistic civic complaint inputs + 1 forced failure scenario.

import assert from 'node:assert/strict'

// ── Validation Schema (Zod-equivalent in pure JS for runner) ─────────────────
const CATEGORIES = [
  'Road Damage',
  'Waterlogging',
  'Garbage',
  'Streetlight',
  'Water Supply',
  'Drainage',
  'Public Safety',
  'Other',
]

function validateInput(body) {
  if (!body.description || typeof body.description !== 'string') {
    return { ok: false, error: 'Description is required' }
  }
  if (body.description.length < 5) {
    return { ok: false, error: 'Description must be at least 5 characters' }
  }
  if (body.description.length > 2000) {
    return { ok: false, error: 'Description exceeds 2000 characters (rate-limit/abuse cap)' }
  }
  if (!body.user_category || !CATEGORIES.includes(body.user_category)) {
    return { ok: false, error: 'Invalid user category' }
  }
  if (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90) {
    return { ok: false, error: 'Invalid latitude' }
  }
  if (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180) {
    return { ok: false, error: 'Invalid longitude' }
  }
  return { ok: true, data: body }
}

function validateAiOutput(ai) {
  if (!ai || typeof ai !== 'object') return null
  const validRisk = ['Low', 'Medium', 'High']
  if (!CATEGORIES.includes(ai.category)) return null
  if (!ai.summary || typeof ai.summary !== 'string') return null
  if (!validRisk.includes(ai.safety_risk)) return null
  if (!validRisk.includes(ai.urgency)) return null
  if (!validRisk.includes(ai.public_impact)) return null
  if (!Array.isArray(ai.keywords) || ai.keywords.length === 0) return null
  return ai
}

// ── Pipeline Simulator (mirrors supabase/functions/submit-report/index.ts) ───
async function simulateSubmitReport(input, mockGeminiCall) {
  // Step 1: Validate input
  const validation = validateInput(input)
  if (!validation.ok) {
    return { status: 400, body: { error: validation.error } }
  }

  // Step 2: Gemini Analysis or Simulated Failure
  let aiResult = null
  let aiError = null
  let aiStatus = 'pending'

  try {
    const rawAi = await mockGeminiCall(input.description, input.user_category)
    aiResult = validateAiOutput(rawAi)
    if (!aiResult) throw new Error('AI output failed schema validation')
    aiStatus = 'success'
  } catch (err) {
    aiStatus = 'failed'
    aiError = err.message
  }

  // Step 3: Priority Scoring
  let priority = null
  if (aiStatus === 'success') {
    const safetyPoints = { High: 40, Medium: 22, Low: 8 }[aiResult.safety_risk]
    const impactPoints = { High: 25, Medium: 14, Low: 5 }[aiResult.public_impact]
    const urgencyPoints = { High: 20, Medium: 11, Low: 4 }[aiResult.urgency]
    const affected = input.affected_count >= 7 ? 15 : input.affected_count >= 4 ? 11 : input.affected_count >= 2 ? 7 : 3
    const total = Math.min(100, safetyPoints + impactPoints + urgencyPoints + affected)
    const level = total >= 75 ? 'Critical' : total >= 50 ? 'High' : total >= 25 ? 'Medium' : 'Low'
    priority = {
      score: total,
      level,
      explanation: `• Safety: ${safetyPoints} pts\n• Impact: ${impactPoints} pts\n• Urgency: ${urgencyPoints} pts\nAI-assisted recommendation — verify before action.`,
    }
  } else {
    // Graceful fallback when AI fails
    priority = {
      score: null,
      level: 'Needs manual review',
      explanation: 'AI analysis unavailable; an officer will review manually.',
    }
  }

  return {
    status: 200,
    body: {
      complaint_code: 'CIV-TEST1',
      category: aiResult ? aiResult.category : input.user_category,
      summary: aiResult ? aiResult.summary : null,
      ai_status: aiStatus,
      ai_error: aiError,
      priority_score: priority.score,
      priority_level: priority.level,
      priority_explanation: priority.explanation,
    },
  }
}

// ── Run Tests ────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('🚀 Running submit-report Pipeline Tests...\n')

  // Case 1: Road Damage (Pothole accident hazard)
  console.log('1. Testing Input 1: Critical Road Damage')
  const res1 = await simulateSubmitReport(
    {
      description: 'Massive deep pothole on main road opposite central bus stand. Two motorbikes crashed.',
      user_category: 'Road Damage',
      latitude: 12.9716,
      longitude: 77.5946,
      affected_count: 8,
    },
    async () => ({
      category: 'Road Damage',
      summary: 'Dangerous pothole opposite central bus stand causing vehicle crashes.',
      safety_risk: 'High',
      urgency: 'High',
      public_impact: 'High',
      recommended_action: 'Emergency barricade and dispatch cold-mix asphalt patch team.',
      keywords: ['pothole', 'accident', 'bus stand', 'hazard'],
    })
  )
  assert.equal(res1.body.ai_status, 'success')
  assert.equal(res1.body.priority_level, 'Critical')
  assert.equal(res1.body.priority_score, 100)
  assert.ok(res1.body.priority_explanation.includes('verify before action'))
  console.log('   ✅ Case 1 Passed: AI success, Critical 100/100, verified disclaimer included.\n')

  // Case 2: Waterlogging
  console.log('2. Testing Input 2: Waterlogging & Drainage Blockage')
  const res2 = await simulateSubmitReport(
    {
      description: 'Water accumulation of 2 feet near market underpass after heavy rainfall.',
      user_category: 'Waterlogging',
      latitude: 12.9680,
      longitude: 77.5990,
      affected_count: 5,
    },
    async () => ({
      category: 'Waterlogging',
      summary: 'Two feet water accumulation under market underpass blocking vehicles.',
      safety_risk: 'Medium',
      urgency: 'High',
      public_impact: 'High',
      recommended_action: 'Deploy suction truck and clear catch basins.',
      keywords: ['waterlogging', 'underpass', 'flood'],
    })
  )
  assert.equal(res2.body.ai_status, 'success')
  assert.equal(res2.body.priority_level, 'Critical')
  assert.equal(res2.body.priority_score, 78) // 22 + 25 + 20 + 11 = 78 (>=75 is Critical)
  console.log('   ✅ Case 2 Passed: AI success, Critical 78/100.\n')

  // Case 3: Streetlight
  console.log('3. Testing Input 3: Broken Streetlight')
  const res3 = await simulateSubmitReport(
    {
      description: 'Streetlight pole #42 has a damaged LED fixture and has been flickering and off for three nights.',
      user_category: 'Streetlight',
      latitude: 12.9750,
      longitude: 77.6010,
      affected_count: 1,
    },
    async () => ({
      category: 'Streetlight',
      summary: 'Damaged LED fixture on streetlight pole #42 non-functional for three nights.',
      safety_risk: 'Low',
      urgency: 'Medium',
      public_impact: 'Low',
      recommended_action: 'Replace LED luminaire module.',
      keywords: ['streetlight', 'pole', 'darkness'],
    })
  )
  assert.equal(res3.body.ai_status, 'success')
  assert.equal(res3.body.priority_level, 'Medium')
  assert.equal(res3.body.priority_score, 27) // 8 + 5 + 11 + 3 = 27
  console.log('   ✅ Case 3 Passed: AI success, Medium 27/100.\n')

  // Case 4: Forced Failure (Gemini API unavailable)
  console.log('4. Testing Input 4: Forced Gemini API Failure Handling')
  const res4 = await simulateSubmitReport(
    {
      description: 'Garbage dump accumulating behind community center.',
      user_category: 'Garbage',
      latitude: 12.9600,
      longitude: 77.5800,
      affected_count: 1,
    },
    async () => {
      throw new Error('Gemini API quota exceeded / timeout')
    }
  )
  assert.equal(res4.body.ai_status, 'failed')
  assert.equal(res4.body.category, 'Garbage') // falls back to user_category
  assert.equal(res4.body.summary, null)
  assert.equal(res4.body.priority_score, null)
  assert.equal(res4.body.priority_level, 'Needs manual review')
  assert.equal(res4.body.priority_explanation, 'AI analysis unavailable; an officer will review manually.')
  console.log('   ✅ Case 4 Passed: Graceful fallback on Gemini failure (no crash, no fake numbers, citizen category preserved, marked for manual review).\n')

  // Case 5: Rate limit / abuse check (description > 2000 chars)
  console.log('5. Testing Abuse Protection: >2000 char description rejection')
  const res5 = await simulateSubmitReport(
    {
      description: 'A'.repeat(2001),
      user_category: 'Other',
      latitude: 12.97,
      longitude: 77.59,
      affected_count: 1,
    },
    async () => ({})
  )
  assert.equal(res5.status, 400)
  assert.ok(res5.body.error.includes('exceeds 2000 characters'))
  console.log('   ✅ Case 5 Passed: 400 Bad Request on >2000 chars abuse payload.\n')

  console.log('🎉 All 5 submit-report pipeline & failure state tests PASSED!\n')
}

runTests().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
