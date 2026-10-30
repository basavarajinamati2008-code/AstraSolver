// CivicPulse AI — Unified Configuration Module
// Single source of truth for civic intelligence algorithms, workflow schemas, and limits.
// Imported by frontend, edge functions, seed scripts, and test suites.

export const CIVIC_CONFIG = {
  // ── Gemini AI Model ───────────────────────────────────────────────────────
  // Recommended production fast model
  GEMINI_MODEL: 'gemini-2.5-flash',

  // ── Workflow Taxonomies ───────────────────────────────────────────────────
  CATEGORIES: [
    'Road Damage',
    'Waterlogging',
    'Garbage',
    'Streetlight',
    'Water Supply',
    'Drainage',
    'Public Safety',
    'Other',
  ] as const,

  DEPARTMENTS: [
    'Roads',
    'Water Board',
    'Sanitation',
    'Electricity',
    'Drainage',
    'Police/Public Safety',
    'Other',
  ] as const,

  STATUSES: [
    'Submitted',
    'Under Review',
    'Assigned',
    'In Progress',
    'Resolved',
  ] as const,

  // ── Priority Scoring System (0–100) ───────────────────────────────────────
  PRIORITY_WEIGHTS: {
    safety: {
      High: 40,
      Medium: 22,
      Low: 8,
    },
    impact: {
      High: 25,
      Medium: 14,
      Low: 5,
    },
    urgency: {
      High: 20,
      Medium: 11,
      Low: 4,
    },
    affectedTiers: [
      { minCount: 7, points: 15 },
      { minCount: 4, points: 11 },
      { minCount: 2, points: 7 },
      { minCount: 1, points: 3 },
    ],
  },

  PRIORITY_LEVEL_THRESHOLDS: {
    Critical: 75,
    High: 50,
    Medium: 25,
    Low: 0,
  },

  // ── Duplicate Detection Formula ───────────────────────────────────────────
  // confidence = w_cosine*cosine + w_category*(catMatch) + w_dist*max(0, 1 - dist/linearDecay)
  DUPLICATE_CONFIG: {
    weights: {
      cosine: 0.45,
      categoryMatch: 0.20,
      distanceScore: 0.35,
    },
    threshold: 0.70,
    candidateRadiusMeters: 500,
    linearDecayDistanceMeters: 300,
  },

  // ── Hotspot Clustering (DBSCAN) ───────────────────────────────────────────
  DBSCAN_CONFIG: {
    epsMeters: 250,
    minPts: 3,
    advisoryWording: 'Possible infrastructure issue, inspection recommended',
  },

  // ── Image Validation & Storage ────────────────────────────────────────────
  IMAGE_CONFIG: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  },

  // ── Input Lengths & Abuse Guards ──────────────────────────────────────────
  INPUT_LIMITS: {
    descriptionMinLength: 10,
    descriptionMaxLength: 2000,
    locationTextMaxLength: 200,
    affectedCountMin: 1,
    affectedCountMax: 5000,
  },

  // ── Sliding Window IP Rate Limiting ───────────────────────────────────────
  RATE_LIMIT_CONFIG: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxSubmissionsPerWindow: 10,
  },
} as const

export type CivicCategory = typeof CIVIC_CONFIG.CATEGORIES[number]
export type CivicDepartment = typeof CIVIC_CONFIG.DEPARTMENTS[number]
export type CivicStatus = typeof CIVIC_CONFIG.STATUSES[number]
export type PriorityLevel = keyof typeof CIVIC_CONFIG.PRIORITY_LEVEL_THRESHOLDS
export type RiskDimension = 'Low' | 'Medium' | 'High'
