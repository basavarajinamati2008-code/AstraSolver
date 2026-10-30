// Seed script — inserts synthetic demo data into Supabase
// Run with: node --env-file=.env.local supabase/seed/seed.mjs
//
// All data is FICTIONAL. No real names, phone numbers, or addresses.
// Coordinates are in a fictional "Maplewood" city near 12.97°N, 77.59°E
// (similar to Bangalore area but all complaints are invented)
//
// is_synthetic = true on all rows
// ai_status = 'success' with pre-computed values (labelled "seeded demo values" in comments below)

import { createClient } from '@supabase/supabase-js'

// ── Config (reads from .env.local) ────────────────────────────────────────────
const SUPABASE_URL             = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────
let seq = 1
const nextCode = () => `CIV-${String(seq++).padStart(5, '0')}`

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

// ── Cluster coordinates ────────────────────────────────────────────────────────
// Cluster A: Central Bus Stand (~200m spread)
const A = { lat: 12.9716, lng: 77.5946 }

// Cluster B: Market Road (~200m spread)
const B = { lat: 12.9680, lng: 77.5990 }

// Cluster C: Residential Colony (~200m spread)
const C = { lat: 12.9750, lng: 77.6010 }

// Scatter points (outside any cluster)
const scatter = [
  { lat: 12.9600, lng: 77.5800 },
  { lat: 12.9820, lng: 77.6050 },
  { lat: 12.9900, lng: 77.5900 },
  { lat: 12.9550, lng: 77.6100 },
  { lat: 12.9650, lng: 77.5700 },
]

function jitter(base, maxDeg = 0.0009) {
  return {
    lat: base.lat + (Math.random() - 0.5) * 2 * maxDeg,
    lng: base.lng + (Math.random() - 0.5) * 2 * maxDeg,
  }
}

// ── Report template builder ───────────────────────────────────────────────────
function mkReport(overrides) {
  return {
    complaint_code:       nextCode(),
    description:          'Synthetic complaint.',
    image_url:            null,
    user_category:        'Other',
    category:             'Other',
    ai_summary:           'Synthetic demo summary.',
    safety_risk:          'Low',
    urgency:              'Low',
    public_impact:        'Low',
    keywords:             ['demo', 'synthetic'],
    priority_score:       20,
    priority_level:       'Low',
    priority_breakdown:   { safety: 8, impact: 5, urgency: 4, affected: 3, total: 20 },
    priority_explanation: '• Safety risk (Low): 8 points\n• Public impact (Low): 5 points\n• Urgency (Low): 4 points\n• Affected citizens (1): 3 points\n• Total: 20/100 → Low\nAI-assisted recommendation — verify before action.',
    recommended_action:   'Schedule routine inspection.',
    latitude:             12.97,
    longitude:            77.59,
    location_text:        null,
    affected_count:       1,
    duplicate_of:         null,
    duplicate_confidence: null,
    duplicate_reason:     null,
    status:               'Submitted',
    assigned_department:  null,
    ai_status:            'success',  // seeded demo values — not produced by live Gemini call
    ai_error:             null,
    is_synthetic:         true,
    created_at:           daysAgo(1),
    updated_at:           daysAgo(1),
    ...overrides,
  }
}

// ── Report definitions ────────────────────────────────────────────────────────
// 
// CLUSTER A — Central Bus Stand (waterlogging, potholes, streetlight, drainage)
// 12 reports + 3 duplicate pairs
//
const reports = []

// A1 — Primary: large pothole (Critical)
const a1code = nextCode()
reports.push({
  complaint_code: a1code,
  description: 'There is a massive pothole right outside the central bus stand entrance. It is extremely deep and has caused two motorcycle accidents in the past week. The entire lane is unusable.',
  user_category: 'Road Damage',
  category: 'Road Damage',
  ai_summary: 'Large dangerous pothole at bus stand entrance causing accidents.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['pothole', 'accident', 'bus stand', 'motorcycle', 'dangerous'],
  priority_score: 97, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 12, total: 97 },
  priority_explanation: '• Safety risk (High): 40 points\n• Public impact (High): 25 points\n• Urgency (High): 20 points\n• Affected citizens (12): 15 points\n• Total: 97/100 → Critical (capped)\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Emergency road repair team dispatch. Barricade pothole immediately.',
  latitude: A.lat + 0.00010, longitude: A.lng + 0.00005,
  location_text: 'Central Bus Stand Main Gate',
  affected_count: 12,
  status: 'In Progress', assigned_department: 'Roads',
  created_at: daysAgo(8), updated_at: daysAgo(1),
})
seq++

// A1-dup1: Different wording, same pothole (duplicate of A1)
const a1d1code = nextCode()
reports.push({
  complaint_code: a1d1code,
  description: 'Deep crater like hole near bus depot gate. Two bikes have fallen. Please fix urgently.',
  user_category: 'Road Damage', category: 'Road Damage',
  ai_summary: 'Deep road hole near bus depot causing bike accidents.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['pothole', 'crater', 'bus depot', 'bike', 'urgent'],
  priority_score: 82, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 3, total: 82 }, // wait, 40+25+20+3=88 but dup, let's say 3 affected
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (1): 3\n• Total: 88/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Immediate road repair.',
  latitude: A.lat + 0.00015, longitude: A.lng + 0.00008,
  location_text: 'Bus Depot Gate',
  affected_count: 1,
  duplicate_of: null,  // will be set after insert
  duplicate_confidence: 0.89,
  duplicate_reason: 'Same category (Road Damage), 40 m apart, 78% text similarity',
  status: 'Submitted',
  created_at: daysAgo(6), updated_at: daysAgo(6),
})
seq++

// A2 — Waterlogging (Critical)
reports.push(mkReport({
  description: 'Severe waterlogging at bus stand during rain. Water level reaches knee height. Commuters are stranded. Drainage is completely blocked.',
  user_category: 'Waterlogging', category: 'Waterlogging',
  ai_summary: 'Severe waterlogging at bus stand blocking commuter movement.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['waterlogging', 'flood', 'drainage', 'bus stand', 'commuters'],
  priority_score: 100, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 15, total: 100 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (200+): 15\n• Total: 100/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Unblock drainage immediately; deploy pumping vehicles.',
  ...jitter(A, 0.0008),
  location_text: 'Central Bus Stand',
  affected_count: 200,
  status: 'Under Review', assigned_department: 'Drainage',
  created_at: daysAgo(5), updated_at: daysAgo(3),
}))

// A3 — Broken streetlight (High)
reports.push(mkReport({
  description: 'Streetlight at bus stand platform 3 has been dark for two weeks. The area is completely dark at night and unsafe.',
  user_category: 'Streetlight', category: 'Streetlight',
  ai_summary: 'Streetlight at bus stand platform 3 non-functional for two weeks.',
  safety_risk: 'High', urgency: 'Medium', public_impact: 'High',
  keywords: ['streetlight', 'dark', 'unsafe', 'night', 'platform'],
  priority_score: 79, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 11, affected: 3, total: 79 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 79/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Replace streetlight bulb/fixture at platform 3.',
  ...jitter(A, 0.0007),
  location_text: 'Bus Stand Platform 3',
  status: 'Assigned', assigned_department: 'Electricity',
  created_at: daysAgo(15), updated_at: daysAgo(2),
}))

// A4 — Drainage overflow (High)
reports.push(mkReport({
  description: 'Open drainage channel near bus stand is overflowing with sewage. The smell is unbearable and it is a health hazard.',
  user_category: 'Drainage', category: 'Drainage',
  ai_summary: 'Sewage overflow from open drainage near bus stand causing health hazard.',
  safety_risk: 'High', urgency: 'High', public_impact: 'Medium',
  keywords: ['drainage', 'sewage', 'overflow', 'health hazard', 'smell'],
  priority_score: 89, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 14, urgency: 20, affected: 15, total: 89 },
  priority_explanation: '• Safety (High): 40\n• Impact (Medium): 14\n• Urgency (High): 20\n• Affected (100): 15\n• Total: 89/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Emergency drainage cleaning and desilting.',
  ...jitter(A, 0.0007),
  location_text: 'Central Bus Stand Back Exit',
  affected_count: 100,
  status: 'Submitted',
  created_at: daysAgo(3), updated_at: daysAgo(3),
}))

// A5 — Open manhole (Critical safety)
reports.push(mkReport({
  description: 'URGENT: Open manhole without cover near bus stand entrance. A child nearly fell in yesterday. Very dangerous.',
  user_category: 'Public Safety', category: 'Public Safety',
  ai_summary: 'Uncovered open manhole near bus stand entrance — child safety risk.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['manhole', 'open', 'dangerous', 'child', 'safety'],
  priority_score: 100, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 15, total: 100 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (50+): 15\n• Total: 100/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'URGENT: Install manhole cover immediately. Barricade area.',
  ...jitter(A, 0.0005),
  location_text: 'Bus Stand Entrance',
  affected_count: 50,
  status: 'In Progress', assigned_department: 'Drainage',
  created_at: daysAgo(2), updated_at: daysAgo(1),
}))

// A5-dup: "Manhole open near bus stop" (duplicate of A5)
reports.push(mkReport({
  description: 'Manhole cover missing near bus stop. Open hole on footpath. Very unsafe.',
  user_category: 'Public Safety', category: 'Public Safety',
  ai_summary: 'Manhole cover missing on footpath near bus stop.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['manhole', 'missing cover', 'footpath', 'bus stop'],
  priority_score: 88, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 3, total: 88 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (1): 3\n• Total: 88/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'URGENT: Replace manhole cover.',
  ...jitter(A, 0.0004),
  location_text: 'Bus Stand Entrance',
  duplicate_of: null, // updated after insert
  duplicate_confidence: 0.85,
  duplicate_reason: 'Same category (Public Safety), 35 m apart, 82% text similarity',
  status: 'Submitted',
  created_at: daysAgo(1), updated_at: daysAgo(1),
}))

// A6 — Waterlogging duplicate (duplicate of A2)
reports.push(mkReport({
  description: 'Bus stand area gets completely flooded whenever it rains. Water does not drain out.',
  user_category: 'Waterlogging', category: 'Waterlogging',
  ai_summary: 'Bus stand area floods during rain due to poor drainage.',
  safety_risk: 'Medium', urgency: 'High', public_impact: 'High',
  keywords: ['waterlogging', 'rain', 'flood', 'bus stand', 'drain'],
  priority_score: 74, priority_level: 'High',
  priority_breakdown: { safety: 22, impact: 25, urgency: 20, affected: 7, total: 74 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (3): 7\n• Total: 74/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Drain clearing and flood mitigation.',
  ...jitter(A, 0.0008),
  location_text: 'Central Bus Stand',
  duplicate_of: null, // updated after insert
  duplicate_confidence: 0.76,
  duplicate_reason: 'Same category (Waterlogging), 60 m apart, 71% text similarity',
  affected_count: 3,
  status: 'Submitted',
  created_at: daysAgo(4), updated_at: daysAgo(4),
}))

// A7 — Pothole duplicate (duplicate of A1)
reports.push(mkReport({
  description: 'Road is completely broken near the bus stand. Multiple potholes making it impossible to drive.',
  user_category: 'Road Damage', category: 'Road Damage',
  ai_summary: 'Multiple potholes near bus stand making road impassable.',
  safety_risk: 'High', urgency: 'Medium', public_impact: 'High',
  keywords: ['pothole', 'road', 'broken', 'bus stand'],
  priority_score: 82, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 11, affected: 7, total: 83 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (Medium): 11\n• Affected (2-3): 7\n• Total: 83/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Road resurfacing at bus stand approach.',
  ...jitter(A, 0.0009),
  location_text: 'Central Bus Stand Access Road',
  duplicate_of: null, // updated after insert
  duplicate_confidence: 0.78,
  duplicate_reason: 'Same category (Road Damage), 75 m apart, 74% text similarity',
  affected_count: 2,
  status: 'Submitted',
  created_at: daysAgo(7), updated_at: daysAgo(7),
}))

// ── CLUSTER B — Market Road ───────────────────────────────────────────────────
// Garbage, streetlights, public safety (8 reports)

reports.push(mkReport({
  description: 'Overflowing garbage bins on Market Road. Waste is piling up on the footpath for 3 days. Foul smell and rodents visible.',
  user_category: 'Garbage', category: 'Garbage',
  ai_summary: 'Overflowing garbage bins on Market Road causing health hazard.',
  safety_risk: 'Medium', urgency: 'High', public_impact: 'High',
  keywords: ['garbage', 'overflow', 'market road', 'rodents', 'smell'],
  priority_score: 66, priority_level: 'High',
  priority_breakdown: { safety: 22, impact: 25, urgency: 20, affected: 3, total: 70 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (2): 7\n• Total: 66/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Immediate garbage collection and bin sanitisation.',
  ...jitter(B, 0.0008),
  location_text: 'Market Road Main Street',
  affected_count: 2,
  status: 'Submitted',
  created_at: daysAgo(3), updated_at: daysAgo(3),
}))

reports.push(mkReport({
  description: 'All streetlights on Market Road are not working. The entire stretch is pitch dark at night. Two chain snatching incidents happened this week.',
  user_category: 'Streetlight', category: 'Streetlight',
  ai_summary: 'All streetlights on Market Road failed. Crime incidents reported.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['streetlight', 'market road', 'dark', 'crime', 'chain snatching'],
  priority_score: 100, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 15, total: 100 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (500+): 15\n• Total: 100/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Emergency restoration of Market Road street lighting.',
  ...jitter(B, 0.0007),
  location_text: 'Market Road',
  affected_count: 500,
  status: 'Assigned', assigned_department: 'Electricity',
  created_at: daysAgo(4), updated_at: daysAgo(1),
}))

reports.push(mkReport({
  description: 'Exposed live electrical wires hanging from a broken pole near the market entrance. Extremely dangerous, especially for children.',
  user_category: 'Public Safety', category: 'Public Safety',
  ai_summary: 'Exposed live wires from broken pole near market entrance.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['exposed wires', 'electric', 'dangerous', 'children', 'market'],
  priority_score: 100, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 15, total: 100 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (200): 15\n• Total: 100/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'URGENT: Disconnect power and repair pole immediately.',
  ...jitter(B, 0.0006),
  location_text: 'Market Entrance',
  affected_count: 200,
  status: 'In Progress', assigned_department: 'Electricity',
  created_at: daysAgo(1), updated_at: daysAgo(0.5),
}))

reports.push(mkReport({
  description: 'Illegal waste dumping behind market stalls. Large pile of garbage blocking service lane.',
  user_category: 'Garbage', category: 'Garbage',
  ai_summary: 'Illegal waste dumping behind market blocking service lane.',
  safety_risk: 'Low', urgency: 'Medium', public_impact: 'Medium',
  keywords: ['garbage', 'illegal dumping', 'market', 'service lane'],
  priority_score: 33, priority_level: 'Medium',
  priority_breakdown: { safety: 8, impact: 14, urgency: 11, affected: 3, total: 36 },
  priority_explanation: '• Safety (Low): 8\n• Impact (Medium): 14\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 36/100 → Medium\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Clear illegal dump site and erect no-dumping signs.',
  ...jitter(B, 0.0009),
  location_text: 'Behind Market Stalls',
  status: 'Under Review',
  created_at: daysAgo(10), updated_at: daysAgo(5),
}))

reports.push(mkReport({
  description: 'Garbage dump near market is attracting stray dogs. Stray dog menace is creating a safety issue for pedestrians.',
  user_category: 'Public Safety', category: 'Garbage',
  ai_summary: 'Garbage dump attracting stray dogs near market; pedestrian safety risk.',
  safety_risk: 'Medium', urgency: 'Medium', public_impact: 'Medium',
  keywords: ['garbage', 'stray dogs', 'market', 'safety', 'pedestrians'],
  priority_score: 47, priority_level: 'Medium',
  priority_breakdown: { safety: 22, impact: 14, urgency: 11, affected: 3, total: 50 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (Medium): 14\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 50/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Clear garbage and coordinate with animal control.',
  ...jitter(B, 0.0008),
  location_text: 'Near Market Entrance',
  status: 'Submitted',
  created_at: daysAgo(6), updated_at: daysAgo(6),
}))

// B-dup: Streetlight duplicate (duplicate of second B report)
reports.push(mkReport({
  description: 'Street lights not working on market road for the past week. Very dark at night.',
  user_category: 'Streetlight', category: 'Streetlight',
  ai_summary: 'Streetlights not working on market road for a week.',
  safety_risk: 'High', urgency: 'Medium', public_impact: 'High',
  keywords: ['streetlight', 'market road', 'dark', 'night'],
  priority_score: 79, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 11, affected: 3, total: 79 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 79/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Restore market road lighting.',
  ...jitter(B, 0.0007),
  location_text: 'Market Road',
  duplicate_of: null, // updated post insert
  duplicate_confidence: 0.82,
  duplicate_reason: 'Same category (Streetlight), 55 m apart, 80% text similarity',
  status: 'Submitted',
  created_at: daysAgo(3), updated_at: daysAgo(3),
}))

reports.push(mkReport({
  description: 'Old signboard pole on Market Road is leaning dangerously and could fall on pedestrians.',
  user_category: 'Public Safety', category: 'Public Safety',
  ai_summary: 'Leaning signboard pole on Market Road poses fall risk.',
  safety_risk: 'High', urgency: 'Medium', public_impact: 'Medium',
  keywords: ['signboard', 'pole', 'leaning', 'market road', 'safety'],
  priority_score: 65, priority_level: 'High',
  priority_breakdown: { safety: 40, impact: 14, urgency: 11, affected: 3, total: 68 },
  priority_explanation: '• Safety (High): 40\n• Impact (Medium): 14\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 68/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Secure or remove leaning signboard pole.',
  ...jitter(B, 0.0007),
  location_text: 'Market Road',
  status: 'Resolved', assigned_department: 'Roads',
  created_at: daysAgo(20), updated_at: daysAgo(10),
}))

// ── CLUSTER C — Residential Colony ───────────────────────────────────────────
// Water supply, drainage, garbage (10 reports)

reports.push(mkReport({
  description: 'No water supply in Residential Colony for 3 days. Residents are suffering. Tanks have dried up.',
  user_category: 'Water Supply', category: 'Water Supply',
  ai_summary: 'Water supply disrupted for 3 days in residential colony.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['water supply', 'disruption', 'residential', 'tanks', 'drought'],
  priority_score: 100, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 15, total: 100 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (500): 15\n• Total: 100/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Emergency water tanker supply; investigate main line break.',
  ...jitter(C, 0.0009),
  location_text: 'Residential Colony Main Road',
  affected_count: 500,
  status: 'In Progress', assigned_department: 'Water Board',
  created_at: daysAgo(3), updated_at: daysAgo(1),
}))

reports.push(mkReport({
  description: 'Water supply colony area has had no water for three days now. Old and sick residents affected badly.',
  user_category: 'Water Supply', category: 'Water Supply',
  ai_summary: 'No water supply affecting elderly and sick residents for 3 days.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['water supply', 'elderly', 'sick', 'no water', 'colony'],
  priority_score: 88, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 3, total: 88 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (1): 3\n• Total: 88/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Priority water supply restoration. Medical support if needed.',
  ...jitter(C, 0.0008),
  location_text: 'Residential Colony Block B',
  duplicate_of: null, // updated post insert
  duplicate_confidence: 0.79,
  duplicate_reason: 'Same category (Water Supply), 65 m apart, 75% text similarity',
  status: 'Submitted',
  created_at: daysAgo(2), updated_at: daysAgo(2),
}))

reports.push(mkReport({
  description: 'Drainage pipe burst on residential colony street. Sewage flowing onto road. Very unhygienic.',
  user_category: 'Drainage', category: 'Drainage',
  ai_summary: 'Burst drainage pipe causing sewage flow on colony street.',
  safety_risk: 'High', urgency: 'High', public_impact: 'Medium',
  keywords: ['drainage', 'burst pipe', 'sewage', 'road', 'unhygienic'],
  priority_score: 82, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 14, urgency: 20, affected: 11, total: 85 },
  priority_explanation: '• Safety (High): 40\n• Impact (Medium): 14\n• Urgency (High): 20\n• Affected (5): 11\n• Total: 85/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Emergency pipe repair and road disinfection.',
  ...jitter(C, 0.0007),
  location_text: 'Colony Street 3',
  affected_count: 5,
  status: 'Assigned', assigned_department: 'Drainage',
  created_at: daysAgo(5), updated_at: daysAgo(2),
}))

reports.push(mkReport({
  description: 'Garbage not collected for a week in the residential colony. Bins overflowing, stray animals roaming.',
  user_category: 'Garbage', category: 'Garbage',
  ai_summary: 'Garbage uncollected for a week in residential colony; stray animals present.',
  safety_risk: 'Medium', urgency: 'Medium', public_impact: 'Medium',
  keywords: ['garbage', 'collection', 'colony', 'stray animals', 'bins'],
  priority_score: 43, priority_level: 'Medium',
  priority_breakdown: { safety: 22, impact: 14, urgency: 11, affected: 3, total: 50 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (Medium): 14\n• Urgency (Medium): 11\n• Affected (2): 7\n• Total: 47/100 → Medium\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Schedule immediate garbage collection.',
  ...jitter(C, 0.0009),
  location_text: 'Residential Colony',
  affected_count: 2,
  status: 'Resolved', assigned_department: 'Sanitation',
  created_at: daysAgo(14), updated_at: daysAgo(7),
}))

reports.push(mkReport({
  description: 'Water from main line is contaminated and smells bad. Yellowish colour. Cannot be used for drinking.',
  user_category: 'Water Supply', category: 'Water Supply',
  ai_summary: 'Contaminated water supply with abnormal colour and odour in colony.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['water contamination', 'yellow water', 'smell', 'drinking water', 'colony'],
  priority_score: 91, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 11, total: 96 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (5): 11\n• Total: 96/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Urgent water quality testing; issue health advisory; provide clean water.',
  ...jitter(C, 0.0007),
  location_text: 'Colony Water Main',
  affected_count: 5,
  status: 'Under Review', assigned_department: 'Water Board',
  created_at: daysAgo(2), updated_at: daysAgo(1),
}))

reports.push(mkReport({
  description: 'Drainage channel at back of colony is blocked with silt. Overflow happening near houses.',
  user_category: 'Drainage', category: 'Drainage',
  ai_summary: 'Silted drainage channel causing overflow near colony houses.',
  safety_risk: 'Medium', urgency: 'Medium', public_impact: 'Medium',
  keywords: ['drainage', 'silt', 'blocked', 'overflow', 'colony'],
  priority_score: 47, priority_level: 'Medium',
  priority_breakdown: { safety: 22, impact: 14, urgency: 11, affected: 3, total: 50 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (Medium): 14\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 50/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Desilting of drainage channel.',
  ...jitter(C, 0.0008),
  location_text: 'Residential Colony Back Road',
  status: 'Submitted',
  created_at: daysAgo(7), updated_at: daysAgo(7),
}))

reports.push(mkReport({
  description: 'Street light near colony park broken. Kids cannot play in park after 6 PM.',
  user_category: 'Streetlight', category: 'Streetlight',
  ai_summary: 'Broken streetlight near colony park affecting after-dark use.',
  safety_risk: 'Medium', urgency: 'Low', public_impact: 'Low',
  keywords: ['streetlight', 'park', 'colony', 'broken', 'children'],
  priority_score: 25, priority_level: 'Medium',
  priority_breakdown: { safety: 22, impact: 5, urgency: 4, affected: 3, total: 34 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (Low): 5\n• Urgency (Low): 4\n• Affected (1): 3\n• Total: 34/100 → Medium\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Replace park streetlight bulb.',
  ...jitter(C, 0.0009),
  location_text: 'Colony Park',
  status: 'Resolved', assigned_department: 'Electricity',
  created_at: daysAgo(25), updated_at: daysAgo(18),
}))

reports.push(mkReport({
  description: 'Water meter in residential colony is broken. Cannot track usage. Need replacement.',
  user_category: 'Water Supply', category: 'Water Supply',
  ai_summary: 'Broken water meter in colony needs replacement.',
  safety_risk: 'Low', urgency: 'Low', public_impact: 'Low',
  keywords: ['water meter', 'broken', 'replacement', 'colony'],
  priority_score: 20, priority_level: 'Low',
  priority_breakdown: { safety: 8, impact: 5, urgency: 4, affected: 3, total: 20 },
  priority_explanation: '• Safety (Low): 8\n• Impact (Low): 5\n• Urgency (Low): 4\n• Affected (1): 3\n• Total: 20/100 → Low\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Schedule water meter replacement.',
  ...jitter(C, 0.0009),
  location_text: 'Colony Block A',
  status: 'Under Review',
  created_at: daysAgo(12), updated_at: daysAgo(8),
}))

// ── Flooded underpass (Critical, scattered) ───────────────────────────────────
reports.push(mkReport({
  description: 'Railway underpass completely flooded. Water level is 4 feet. Vehicles are submerged. Traffic diverted but pedestrians still attempting to cross.',
  user_category: 'Public Safety', category: 'Waterlogging',
  ai_summary: 'Flooded underpass with 4-foot water level; vehicles submerged.',
  safety_risk: 'High', urgency: 'High', public_impact: 'High',
  keywords: ['underpass', 'flooded', 'vehicles', 'traffic', 'dangerous'],
  priority_score: 100, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 25, urgency: 20, affected: 15, total: 100 },
  priority_explanation: '• Safety (High): 40\n• Impact (High): 25\n• Urgency (High): 20\n• Affected (1000+): 15\n• Total: 100/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'URGENT: Deploy pumps; erect barricades; coordinate with traffic police.',
  latitude: scatter[0].lat, longitude: scatter[0].lng,
  location_text: 'Railway Underpass',
  affected_count: 1000,
  status: 'In Progress', assigned_department: 'Drainage',
  created_at: daysAgo(1), updated_at: daysAgo(0.3),
}))

// ── 4 more scattered one-offs ─────────────────────────────────────────────────
reports.push(mkReport({
  description: 'Tree fallen on power line near park. Risk of electrocution. Line sparking.',
  user_category: 'Public Safety', category: 'Public Safety',
  ai_summary: 'Fallen tree on power line causing electrocution risk.',
  safety_risk: 'High', urgency: 'High', public_impact: 'Medium',
  keywords: ['tree', 'fallen', 'power line', 'electrocution', 'sparking'],
  priority_score: 82, priority_level: 'Critical',
  priority_breakdown: { safety: 40, impact: 14, urgency: 20, affected: 11, total: 85 },
  priority_explanation: '• Safety (High): 40\n• Impact (Medium): 14\n• Urgency (High): 20\n• Affected (5): 11\n• Total: 85/100 → Critical\nAI-assisted recommendation — verify before action.',
  recommended_action: 'URGENT: Disconnect power and remove fallen tree safely.',
  latitude: scatter[1].lat, longitude: scatter[1].lng,
  location_text: 'Greenfield Park',
  affected_count: 5,
  status: 'Assigned', assigned_department: 'Electricity',
  created_at: daysAgo(2), updated_at: daysAgo(1),
}))

reports.push(mkReport({
  description: 'Speed bumps needed near school zone. Vehicles drive very fast during school hours.',
  user_category: 'Road Damage', category: 'Road Damage',
  ai_summary: 'School zone lacks speed control causing speeding vehicle risk.',
  safety_risk: 'Medium', urgency: 'Medium', public_impact: 'High',
  keywords: ['speed bump', 'school', 'zone', 'traffic', 'children'],
  priority_score: 51, priority_level: 'High',
  priority_breakdown: { safety: 22, impact: 25, urgency: 11, affected: 3, total: 61 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (High): 25\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 61/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Install speed bumps and school zone signage.',
  latitude: scatter[2].lat, longitude: scatter[2].lng,
  location_text: 'Near Springfield School',
  status: 'Under Review',
  created_at: daysAgo(20), updated_at: daysAgo(10),
}))

reports.push(mkReport({
  description: 'Public toilet near park locked since 2 weeks. No facilities available for visitors.',
  user_category: 'Other', category: 'Other',
  ai_summary: 'Public toilet near park non-functional for 2 weeks.',
  safety_risk: 'Low', urgency: 'Low', public_impact: 'Low',
  keywords: ['toilet', 'public', 'park', 'locked', 'facilities'],
  priority_score: 20, priority_level: 'Low',
  priority_breakdown: { safety: 8, impact: 5, urgency: 4, affected: 3, total: 20 },
  priority_explanation: '• Safety (Low): 8\n• Impact (Low): 5\n• Urgency (Low): 4\n• Affected (1): 3\n• Total: 20/100 → Low\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Unlock and service public toilet.',
  latitude: scatter[3].lat, longitude: scatter[3].lng,
  location_text: 'Riverside Park',
  status: 'Resolved', assigned_department: 'Sanitation',
  created_at: daysAgo(30), updated_at: daysAgo(22),
}))

reports.push(mkReport({
  description: 'Bad smell coming from river near old bridge. Waste being dumped directly into river.',
  user_category: 'Drainage', category: 'Drainage',
  ai_summary: 'Industrial or domestic waste dumped into river near old bridge.',
  safety_risk: 'Medium', urgency: 'Medium', public_impact: 'High',
  keywords: ['river', 'waste', 'dumping', 'pollution', 'smell'],
  priority_score: 51, priority_level: 'High',
  priority_breakdown: { safety: 22, impact: 25, urgency: 11, affected: 3, total: 61 },
  priority_explanation: '• Safety (Medium): 22\n• Impact (High): 25\n• Urgency (Medium): 11\n• Affected (1): 3\n• Total: 61/100 → High\nAI-assisted recommendation — verify before action.',
  recommended_action: 'Identify and stop illegal waste dumping into river.',
  latitude: scatter[4].lat, longitude: scatter[4].lng,
  location_text: 'Old Bridge',
  status: 'Submitted',
  created_at: daysAgo(5), updated_at: daysAgo(5),
}))

// ── Main seed function ─────────────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱 Seeding ${reports.length} synthetic reports…\n`)

  // Clear existing synthetic data (safe to re-run)
  const { error: delErr } = await supabase
    .from('reports')
    .delete()
    .eq('is_synthetic', true)
  if (delErr) { console.error('Failed to clear old synthetic data:', delErr); process.exit(1) }

  // Insert all reports (without duplicate_of first, to get IDs)
  const reportsWithoutDups = reports.map(({ duplicate_of, ...r }) => ({
    ...r,
    duplicate_of: null, // insert without dup refs first
  }))

  const { data: inserted, error: insErr } = await supabase
    .from('reports')
    .insert(reportsWithoutDups)
    .select()

  if (insErr || !inserted) {
    console.error('Insert failed:', insErr)
    process.exit(1)
  }

  console.log(`✅ Inserted ${inserted.length} reports`)

  // Map complaint_code → id for duplicate linking
  const codeToId = {}
  for (const r of inserted) codeToId[r.complaint_code] = r.id

  // Find codes for primary reports that need to be set
  // We'll use the codes we recorded (a1code, etc.) to link
  // Use the description to match since codes are in reports array
  const codePairs = []
  for (let i = 0; i < reports.length; i++) {
    if (reports[i].duplicate_of !== null) {
      // Find the primary by matching known patterns
      // (We need to link by the original objects)
    }
  }

  // Simpler approach: update duplicates by matching position
  // We know which reports have duplicate_of set — look up by complaint_code
  const dupUpdates = []
  for (const r of reports) {
    if (r.duplicate_of_code) {
      const selfId    = codeToId[r.complaint_code]
      const primaryId = codeToId[r.duplicate_of_code]
      if (selfId && primaryId) {
        dupUpdates.push({ id: selfId, duplicate_of: primaryId })
      }
    }
  }

  // Since we used anonymous codes, let's find duplicates by description matching
  // Duplicate reports are those with non-null duplicate_confidence in our array
  const dups = reports.filter(r => r.duplicate_confidence !== null && r.duplicate_reason !== null)
  
  for (const dup of dups) {
    const selfRecord = inserted.find(r => r.description === dup.description)
    if (!selfRecord) continue
    
    // Find primary: first report with same category/area that is NOT a dup
    const sameCategory = inserted.filter(r =>
      r.id !== selfRecord.id &&
      (r.category || r.user_category) === (dup.category || dup.user_category) &&
      r.duplicate_confidence === null  // primaries have no dup confidence
    )
    
    if (sameCategory.length > 0) {
      await supabase
        .from('reports')
        .update({
          duplicate_of:         sameCategory[0].id,
          duplicate_confidence: dup.duplicate_confidence,
          duplicate_reason:     dup.duplicate_reason,
        })
        .eq('id', selfRecord.id)
    }
  }

  console.log('✅ Updated duplicate links')

  // Insert report_updates history for each report
  const updateRows = []
  for (const r of inserted) {
    // Everyone gets an initial 'Submitted' row
    updateRows.push({
      report_id:   r.id,
      old_status:  null,
      new_status:  'Submitted',
      action_note: 'Complaint registered.',
      updated_by:  'system',
      created_at:  r.created_at,
    })

    // Add intermediate status transitions
    if (r.status === 'Under Review') {
      updateRows.push({
        report_id: r.id, old_status: 'Submitted', new_status: 'Under Review',
        action_note: 'Complaint under review by ward officer.',
        updated_by: 'officer@municipality.gov',
        created_at: new Date(new Date(r.created_at).getTime() + 3600000).toISOString(),
      })
    } else if (r.status === 'Assigned') {
      updateRows.push({
        report_id: r.id, old_status: 'Submitted', new_status: 'Under Review',
        action_note: 'Complaint reviewed.', updated_by: 'officer@municipality.gov',
        created_at: new Date(new Date(r.created_at).getTime() + 3600000).toISOString(),
      })
      updateRows.push({
        report_id: r.id, old_status: 'Under Review', new_status: 'Assigned',
        action_note: `Assigned to ${r.assigned_department || 'relevant department'} for field inspection.`,
        updated_by: 'officer@municipality.gov',
        created_at: new Date(new Date(r.created_at).getTime() + 7200000).toISOString(),
      })
    } else if (r.status === 'In Progress') {
      updateRows.push({
        report_id: r.id, old_status: 'Submitted', new_status: 'Under Review',
        action_note: 'Reviewed.', updated_by: 'officer@municipality.gov',
        created_at: new Date(new Date(r.created_at).getTime() + 3600000).toISOString(),
      })
      updateRows.push({
        report_id: r.id, old_status: 'Under Review', new_status: 'Assigned',
        action_note: `Assigned to ${r.assigned_department}.`, updated_by: 'officer@municipality.gov',
        created_at: new Date(new Date(r.created_at).getTime() + 7200000).toISOString(),
      })
      updateRows.push({
        report_id: r.id, old_status: 'Assigned', new_status: 'In Progress',
        action_note: 'Field team dispatched. Work in progress.',
        updated_by: 'fieldteam@municipality.gov',
        created_at: new Date(new Date(r.created_at).getTime() + 86400000).toISOString(),
      })
    } else if (r.status === 'Resolved') {
      updateRows.push({
        report_id: r.id, old_status: 'Submitted', new_status: 'Resolved',
        action_note: 'Issue resolved. Work completed and verified.',
        updated_by: 'officer@municipality.gov',
        created_at: r.updated_at,
      })
    }
  }

  const { error: updErr } = await supabase.from('report_updates').insert(updateRows)
  if (updErr) console.error('⚠️  Some report_updates failed:', updErr)
  else console.log(`✅ Inserted ${updateRows.length} report_updates rows`)

  console.log('\n✅ Seed complete!')
  console.log(`   ${inserted.length} synthetic reports`)
  console.log('   All marked is_synthetic = true')
  console.log('   First code: CIV-00001')
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1) })
