#!/usr/bin/env node
// Evaluation runner for CivicPulse AI Duplicate Detection Benchmark
// Evaluates the exact multi-factor duplicate detection algorithm against 30 labeled test pairs.
// Computes Precision, Recall, F1 score and reports any edge cases or failures.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// ── Load Config ─────────────────────────────────────────────────────────────
const configFile = fs.readFileSync(path.join(rootDir, 'config', 'civicpulse.config.ts'), 'utf8')
const cosineMatch = configFile.match(/cosine:\s*([0-9.]+)/)
const catMatch = configFile.match(/categoryMatch:\s*([0-9.]+)/)
const distMatch = configFile.match(/distanceScore:\s*([0-9.]+)/)
const thresholdMatch = configFile.match(/threshold:\s*([0-9.]+)/)
const radiusMatch = configFile.match(/candidateRadiusMeters:\s*([0-9.]+)/)
const linearDecayMatch = configFile.match(/linearDecayDistanceMeters:\s*([0-9.]+)/)

if (!cosineMatch || !catMatch || !distMatch || !thresholdMatch || !radiusMatch || !linearDecayMatch) {
  console.error('Failed to parse DUPLICATE_CONFIG from config/civicpulse.config.ts')
  process.exit(1)
}

const CONFIG = {
  weights: {
    cosine: parseFloat(cosineMatch[1]),
    categoryMatch: parseFloat(catMatch[1]),
    distanceScore: parseFloat(distMatch[1])
  },
  threshold: parseFloat(thresholdMatch[1]),
  candidateRadiusMeters: parseFloat(radiusMatch[1]),
  linearDecayDistanceMeters: parseFloat(linearDecayMatch[1])
}

// ── Math & NLP Helpers (Exact match to supabase/functions/_shared) ─────────
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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth radius in meters
  const toRad = deg => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function evaluatePair(pair) {
  const { report_a, report_b } = pair
  const dist = haversine(report_a.latitude, report_a.longitude, report_b.latitude, report_b.longitude)

  if (dist > CONFIG.candidateRadiusMeters) {
    return {
      distanceMeters: Math.round(dist),
      cosineSim: 0,
      categoryMatch: 0,
      distScore: 0,
      confidence: 0,
      predicted: false
    }
  }

  const cosineSim = textSimilarity(report_a.description, report_b.description)
  const categoryMatch = report_a.category === report_b.category ? 1 : 0
  const distScore = Math.max(0, 1 - dist / CONFIG.linearDecayDistanceMeters)

  const confidence =
    CONFIG.weights.cosine * cosineSim +
    CONFIG.weights.categoryMatch * categoryMatch +
    CONFIG.weights.distanceScore * distScore

  const predicted = confidence >= CONFIG.threshold

  return {
    distanceMeters: Math.round(dist),
    cosineSim: Math.round(cosineSim * 1000) / 1000,
    categoryMatch,
    distScore: Math.round(distScore * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
    predicted
  }
}

// ── Run Evaluation ──────────────────────────────────────────────────────────
const pairsPath = path.join(__dirname, 'duplicate_pairs.json')
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'))

console.log('='.repeat(80))
console.log(' CivicPulse AI — Duplicate Detection Benchmark (30 Labeled Pairs)')
console.log(' Config: Weights (Cosine: ' + CONFIG.weights.cosine + ', Category: ' + CONFIG.weights.categoryMatch + ', Distance: ' + CONFIG.weights.distanceScore + ')')
console.log(' Config: Primary Threshold: ' + CONFIG.threshold + ' | Candidate Radius: ' + CONFIG.candidateRadiusMeters + 'm | Decay: ' + CONFIG.linearDecayDistanceMeters + 'm')
console.log('='.repeat(80))

let tp = 0, fp = 0, fn = 0, tn = 0
const failures = []

pairs.forEach(pair => {
  const evalResult = evaluatePair(pair)
  const isMatch = evalResult.predicted === pair.same_issue

  if (pair.same_issue && evalResult.predicted) tp++
  else if (!pair.same_issue && evalResult.predicted) fp++
  else if (pair.same_issue && !evalResult.predicted) fn++
  else tn++

  const statusSymbol = isMatch ? '✓ PASS' : '✗ FAIL'
  const tag = `[#${String(pair.id).padStart(2, '0')}] ${statusSymbol.padEnd(8)}`
  console.log(
    `${tag} Expected: ${String(pair.same_issue).padEnd(5)} | Pred: ${String(evalResult.predicted).padEnd(5)} | Conf: ${evalResult.confidence.toFixed(3)} | Dist: ${String(evalResult.distanceMeters) + 'm'} | Sim: ${evalResult.cosineSim} | ${pair.variation_type}`
  )

  if (!isMatch) {
    failures.push({
      pairId: pair.id,
      same_issue: pair.same_issue,
      evalResult,
      report_a: pair.report_a.description,
      report_b: pair.report_b.description
    })
  }
})

// Metrics calculation at primary threshold
const precision = tp + fp > 0 ? tp / (tp + fp) : 0
const recall = tp + fn > 0 ? tp / (tp + fn) : 0
const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
const accuracy = (tp + tn) / pairs.length

console.log('='.repeat(80))
console.log(` PRIMARY EVALUATION METRICS (Threshold = ${CONFIG.threshold})`)
console.log('='.repeat(80))
console.log(` True Positives  (TP) : ${tp}`)
console.log(` False Positives (FP) : ${fp}`)
console.log(` False Negatives (FN) : ${fn}`)
console.log(` True Negatives  (TN) : ${tn}`)
console.log('-'.repeat(40))
console.log(` Precision : ${(precision * 100).toFixed(1)}%`)
console.log(` Recall    : ${(recall * 100).toFixed(1)}%`)
console.log(` F1 Score  : ${(f1 * 100).toFixed(1)}%`)
console.log(` Accuracy  : ${(accuracy * 100).toFixed(1)}% (${tp + tn}/${pairs.length} pairs)`)
console.log('='.repeat(80))

// ── Threshold Sensitivity Analysis ──────────────────────────────────────────
console.log('\n' + '='.repeat(80))
console.log(' THRESHOLD SENSITIVITY CURVE')
console.log('='.repeat(80))
console.log('| Threshold | Precision | Recall  | F1 Score | Accuracy | TP | FP | FN | TN |')
console.log('|-----------|-----------|---------|----------|----------|----|----|----|----|')

const sweepThresholds = [0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75]
sweepThresholds.forEach(t => {
  let s_tp = 0, s_fp = 0, s_fn = 0, s_tn = 0
  pairs.forEach(p => {
    const res = evaluatePair(p)
    const pred = res.confidence >= t
    if (p.same_issue && pred) s_tp++
    else if (!p.same_issue && pred) s_fp++
    else if (p.same_issue && !pred) s_fn++
    else s_tn++
  })
  const p_rec = s_tp + s_fp > 0 ? s_tp / (s_tp + s_fp) : 0
  const r_rec = s_tp + s_fn > 0 ? s_tp / (s_tp + s_fn) : 0
  const f_rec = p_rec + r_rec > 0 ? (2 * p_rec * r_rec) / (p_rec + r_rec) : 0
  const acc_rec = (s_tp + s_tn) / pairs.length

  const mark = Math.abs(t - CONFIG.threshold) < 0.001 ? ' *' : '  '
  console.log(
    `|   ${t.toFixed(2)}${mark}  |   ${(p_rec * 100).toFixed(1).padStart(5)}%  |  ${(r_rec * 100).toFixed(1).padStart(5)}% |   ${(f_rec * 100).toFixed(1).padStart(5)}% |   ${(acc_rec * 100).toFixed(1).padStart(5)}% | ${String(s_tp).padStart(2)} | ${String(s_fp).padStart(2)} | ${String(s_fn).padStart(2)} | ${String(s_tn).padStart(2)} |`
  )
})
console.log('(* denotes active threshold in config/civicpulse.config.ts)')
console.log('='.repeat(80))

if (failures.length > 0) {
  console.log(`\nANALYSIS OF BOUNDARY FAILURES AT THRESHOLD ${CONFIG.threshold} (${failures.length} cases):`)
  failures.forEach(f => {
    console.log(`\n• Pair #${f.pairId}: Ground Truth=${f.same_issue}, Predicted=${f.evalResult.predicted}, Confidence=${f.evalResult.confidence}`)
    console.log(`  Report A: "${f.report_a}"`)
    console.log(`  Report B: "${f.report_b}"`)
    console.log(`  Note: Lexical gap with TF-IDF cosine similarity (${f.evalResult.cosineSim}). Needs dense semantic embeddings or threshold relaxation to ~0.55.`)
  })
} else {
  console.log('\nAll 30 benchmark pairs classified successfully!')
}

// Exit cleanly so CI and scripts can report metrics
process.exit(0)
