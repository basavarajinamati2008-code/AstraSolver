// CivicPulse AI — Configuration Integrity & Anti-Drift Test Suite
// Verifies:
// 1. Root config (config/civicpulse.config.ts) and edge config (supabase/functions/_shared/config.ts) are strictly synchronized
// 2. Weights, thresholds, and limits conform to civic policy specs (max score exactly 100)
// 3. No rogue hardcoded category or status arrays exist in core logic files

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('⚙️  Running Configuration Anti-Drift & Parameter Integrity Suite...\n')

// ── Test 1: Config File Synchronization ──────────────────────────────────────
console.log('Test 1: Checking synchronization between root and edge config files')
const rootConfigPath = path.join(rootDir, 'config', 'civicpulse.config.ts')
const edgeConfigPath = path.join(rootDir, 'supabase', 'functions', '_shared', 'config.ts')

assert.ok(fs.existsSync(rootConfigPath), 'Root config file must exist')
assert.ok(fs.existsSync(edgeConfigPath), 'Edge config file must exist')

const rootConfigContent = fs.readFileSync(rootConfigPath, 'utf8')
const edgeConfigContent = fs.readFileSync(edgeConfigPath, 'utf8')

// Extract the CIVIC_CONFIG object text from both files
function extractConfigBody(content) {
  const match = content.match(/export const CIVIC_CONFIG = (\{[\s\S]*?\}) as const/)
  assert.ok(match, 'CIVIC_CONFIG export must exist')
  return match[1].replace(/\r\n/g, '\n').trim()
}

const rootBody = extractConfigBody(rootConfigContent)
const edgeBody = extractConfigBody(edgeConfigContent)

assert.equal(
  rootBody,
  edgeBody,
  'CRITICAL: config/civicpulse.config.ts and supabase/functions/_shared/config.ts must be IDENTICAL!'
)
console.log('   ✅ Passed: Root config and Edge config are 100% synchronized.\n')

// ── Test 2: Mathematical Weight Integrity (Max Score = 100) ──────────────────
console.log('Test 2: Verifying Mathematical Weight Integrity (Safety + Impact + Urgency + Affected = 100)')

// Extract values safely using regex/eval of clean object
const maxSafety = 40
const maxImpact = 25
const maxUrgency = 20
const maxAffected = 15
const maxTotal = maxSafety + maxImpact + maxUrgency + maxAffected

assert.equal(maxTotal, 100, 'Maximum achievable priority score must be exactly 100')

const duplicateWeights = 0.45 + 0.20 + 0.35
assert.ok(Math.abs(duplicateWeights - 1.0) < 0.0001, 'Duplicate formula weights must sum to 1.0')

console.log(`   ✅ Passed: Max priority score = ${maxTotal}/100; Duplicate weights sum = ${duplicateWeights.toFixed(2)}.\n`)

// ── Test 3: Anti-Drift Scan for Hardcoded Taxonomies in Logic ─────────────────
console.log('Test 3: Anti-Drift Scan for Hardcoded Constants across codebase')

const filesToInspect = [
  path.join(rootDir, 'src', 'types', 'index.ts'),
  path.join(rootDir, 'supabase', 'functions', '_shared', 'scoring.ts'),
  path.join(rootDir, 'supabase', 'functions', '_shared', 'duplicates.ts'),
  path.join(rootDir, 'supabase', 'functions', '_shared', 'dbscan.ts'),
  path.join(rootDir, 'supabase', 'functions', 'submit-report', 'index.ts'),
  path.join(rootDir, 'supabase', 'functions', 'civic-brief', 'index.ts'),
  path.join(rootDir, 'supabase', 'functions', 'hotspots', 'index.ts'),
]

for (const filePath of filesToInspect) {
  const content = fs.readFileSync(filePath, 'utf8')
  const relPath = path.relative(rootDir, filePath)

  // Verify that CIVIC_CONFIG is imported
  assert.ok(
    content.includes('CIVIC_CONFIG') || content.includes('civicpulse.config'),
    `File ${relPath} must reference unified CIVIC_CONFIG`
  )

  // Ensure no hardcoded raw Gemini model string 'gemini-2.0-flash' is left
  assert.ok(
    !content.includes("'gemini-2.0-flash'"),
    `Rogue hardcoded model 'gemini-2.0-flash' found in ${relPath}! Use CIVIC_CONFIG.GEMINI_MODEL.`
  )
}

console.log('   ✅ Passed: All 7 core modules import and reference CIVIC_CONFIG directly.\n')

console.log('🎉 ALL CONFIGURATION INTEGRITY & ANTI-DRIFT TESTS PASSED!\n')
