# CivicPulse AI — Customization & City Adaptation Guide

CivicPulse AI is designed to be **fully programmable**. All civic parameters, workflow taxonomies, geographic bounds, scoring weights, and duplicate detection thresholds are controlled by a single configuration module:

📁 **`config/civicpulse.config.ts`** *(with automatic synchronization to `supabase/functions/_shared/config.ts`)*

---

## 1. Changing the City & Geographic Coordinates

### Step 1: Update Default Map Coordinates
In `src/components/citizen/LocationPicker.tsx`, set your city's default center coordinates:
```typescript
// Replace with your municipality's latitude and longitude
const DEFAULT_CENTER: [number, number] = [13.0827, 80.2707]; // Example: Chennai, India
const DEFAULT_ZOOM = 14;
```

### Step 2: Update Seed Script Coordinates
If generating synthetic incidents for local drills, update the base cluster coordinates in `supabase/seed/seed.mjs`:
```javascript
// Example: New city coordinates for Cluster A, B, C
const A = { lat: 13.0827, lng: 80.2707 }; // Zone 1
const B = { lat: 13.0890, lng: 80.2750 }; // Zone 2
const C = { lat: 13.0780, lng: 80.2650 }; // Zone 3
```

---

## 2. Modifying Categories & Departments

### Step 1: Edit Taxonomies in `config/civicpulse.config.ts`
```typescript
export const CIVIC_CONFIG = {
  CATEGORIES: [
    'Road Damage',
    'Waterlogging',
    'Garbage',
    'Streetlight',
    'Water Supply',
    'Drainage',
    'Public Safety',
    'Parks & Trees', // Added new custom category
    'Other',
  ] as const,

  DEPARTMENTS: [
    'Roads & Bridges',
    'Metro Water & Sewerage',
    'Solid Waste Management',
    'Public Lighting',
    'Stormwater Drainage',
    'Police & Traffic',
    'Parks Department', // Added new department
    'Other',
  ] as const,
  // ...
}
```

### Step 2: Synchronize Edge Functions & Database
1. Copy the updated config to Edge Functions:
   ```bash
   node -e "fs.copyFileSync('config/civicpulse.config.ts', 'supabase/functions/_shared/config.ts')"
   ```
2. If your database migration enforces a SQL `CHECK` constraint on categories or departments, update the check constraint in a new migration:
   ```sql
   ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_category_check;
   ```

---

## 3. Tuning Priority Scoring Weights

You can adjust how urgent and safety-critical complaints are prioritized in `config/civicpulse.config.ts`:

```typescript
PRIORITY_WEIGHTS: {
  safety: {
    High: 40,   // Critical danger to human life / structural hazard
    Medium: 22, // Potential injury or minor hazard
    Low: 8,     // Non-hazardous inconvenience
  },
  impact: {
    High: 25,   // Major transit artery, hospital road, school zone
    Medium: 14, // Secondary residential road
    Low: 5,     // Isolated alley or service lane
  },
  urgency: {
    High: 20,   // Rapidly worsening (e.g., active water main burst)
    Medium: 11, // Persistent unresolved issue
    Low: 4,     // Routine maintenance request
  },
  affectedTiers: [
    { minCount: 7, points: 15 },
    { minCount: 4, points: 11 },
    { minCount: 2, points: 7 },
    { minCount: 1, points: 3 },
  ],
}
```

---

## 4. Tuning Duplicate Detection Sensitivity

Duplicate detection combines semantic NLP similarity, category matching, and geographical proximity:

$$\text{confidence} = w_{\text{cosine}} \times \text{cosine} + w_{\text{category}} \times \text{categoryMatch} + w_{\text{dist}} \times \max(0, 1 - \text{dist}/\text{linearDecay})$$

Adjust parameters in `config/civicpulse.config.ts`:
```typescript
DUPLICATE_CONFIG: {
  weights: {
    cosine: 0.45,        // Importance of textual description similarity
    categoryMatch: 0.20, // Importance of identical category
    distanceScore: 0.35, // Importance of geographic proximity
  },
  threshold: 0.70,                  // Minimum confidence score to flag duplicate
  candidateRadiusMeters: 500,       // Search radius window
  linearDecayDistanceMeters: 300,   // Distance at which distance points reach 0
}
```

---

## 5. Verifying Anti-Drift

Whenever you make configuration changes, run the anti-drift test suite to verify that Edge Functions, frontend components, and mathematical constraints remain synchronized:

```bash
node tests/config-drift.test.mjs
```
