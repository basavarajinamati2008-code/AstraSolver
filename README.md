# CivicPulse AI

> *"From Citizen Complaints to Intelligent Civic Action."*

Built for **PromptWars x ASTRA — AI for Civic Impact** (Problem Track: *From Complaints to Action*).

---

## 1. System Architecture

```text
[ Citizen Portal (Mobile-First / React) ]          [ Municipal Dashboard (/admin) ]
        |                   |                                    |
  Report Issue         Track Status                      Operations Analytics
  (Leaflet Pin)      (track_report RPC)                 (Hotspots & Recharts)
        |                   |                                    |
        v                   v                                    v
+--------------------------------------------------------------------------------+
|                         Supabase Postgres (Database & Auth)                   |
|  - reports (RLS protected)                                                     |
|  - report_updates (Audit History)                                              |
|  - briefs (AI Brief Cache)                                                     |
|  - Storage: report-images (Public read, max 5 MB image upload)                 |
+--------------------------------------------------------------------------------+
        ^                                                        ^
        |                                                        |
+--------------------------------------------------------------------------------+
|                   Supabase Edge Functions (Deno / TypeScript)                  |
|                                                                                |
|  1. submit-report                                                              |
|     Input Validation (Zod) -> Gemini API -> Pure Algorithms -> DB Write       |
|                                                                                |
|  2. hotspots                                                                   |
|     DBSCAN Clustering (eps=250m, minPts=3) over open reports                   |
|                                                                                |
|  3. civic-brief                                                                |
|     Aggregates stats -> Gemini Brief Synthesis -> Stored in briefs             |
+--------------------------------------------------------------------------------+
        |
        v
[ Google Gemini API (gemini-2.0-flash) ]
  - Structured JSON Output Schema
  - Risk categorization: Safety, Urgency, Public Impact
```

---

## 2. Shared Algorithmic Modules (`supabase/functions/_shared/`)

Pure TypeScript logic built with zero external dependencies and covered by unit tests:

1. **`haversine.ts`**: Great-circle distance calculations on spherical coordinates.
2. **`tfidf.ts`**: Hand-written tokenizer, municipal civic stopword filter, term frequency, inverse document frequency, and vector cosine similarity.
3. **`duplicates.ts`**: Multi-factor duplicate confidence engine:
   $$\text{confidence} = 0.45 \times \text{cosine} + 0.20 \times \text{category\_match} + 0.35 \times \max(0, 1 - \text{dist}/300\text{m})$$
   Threshold: $\ge 0.70$. Resolves transitive chains back to the root primary report.
4. **`scoring.ts`**: Weighted multi-factor priority algorithm:
   * **Safety Risk:** High (40) / Medium (22) / Low (8)
   * **Public Impact:** High (25) / Medium (14) / Low (5)
   * **Urgency:** High (20) / Medium (11) / Low (4)
   * **Affected Citizens:** $1 \to 3$, $2\text{--}3 \to 7$, $4\text{--}6 \to 11$, $7+ \to 15$
   * **Priority Levels:** 0–24 Low, 25–49 Medium, 50–74 High, 75–100 Critical.
5. **`dbscan.ts`**: Density-based spatial clustering of applications with noise ($\text{eps}=250\text{m}$, $\text{minPts}=3$) for unsupervised civic cluster discovery.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required parameters:

```env
# Supabase (Safe for frontend bundle via Vite)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Server-Side Secrets (Configured ONLY in Supabase Secrets / CLI)
# DO NOT put these in frontend code or git!
GEMINI_API_KEY=AIzaSy...
```

To set secrets for Supabase Edge Functions (Edge Functions automatically receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in their execution runtime):
```bash
supabase secrets set GEMINI_API_KEY="your-gemini-api-key"
```

---

## 4. How to Run Locally

### Prerequisites
* Node.js v20+
* npm or pnpm

### Running the Frontend
```bash
# Install dependencies
npm install

# Run Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running the Test Suites
```bash
# Pure Node unit tests (Haversine, TF-IDF, Duplicates, Scoring, DBSCAN)
node tests/runner.mjs

# submit-report pipeline & failure state tests
node tests/test-submit-report.mjs

# 14-Step End-to-End Civic Lifecycle Simulation
node tests/test-e2e-journey.mjs
```

---

## 5. Database Setup & Seeding

1. **Apply Migration:**
   * In Supabase Dashboard -> **SQL Editor**, paste and run `supabase/migrations/20241030000001_initial_schema.sql`.
   * Or via CLI: `supabase db push`.
2. **Storage Bucket:**
   * Create bucket: `report-images`
   * Enable Public Read
   * Allow anonymous image uploads ($\le 5\text{ MB}$, JPEG/PNG/WebP)
3. **Execute Seed Script (45+ synthetic incidents):**
   ```bash
   node supabase/seed/seed.mjs
   ```

---

## 6. How to Deploy

### Frontend (Vercel)
1. Import repository into [Vercel](https://vercel.com).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure Environment Variables:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
6. Deploy. `vercel.json` automatically configures client-side SPA route rewrites.

### Edge Functions (Supabase)
```bash
supabase functions deploy submit-report --no-verify-jwt
supabase functions deploy hotspots --no-verify-jwt
supabase functions deploy civic-brief
```

---

## 7. 14-Step End-to-End Demo Script

| Step | Action | Expected Behavior |
|---|---|---|
| **1** | Open `/` (Landing Page) | View branding, problem statement, live civic counts (`public_stats()`). |
| **2** | Click **Report an Issue** | Opens `/report` under 60-second mobile form. |
| **3** | Click map near Central Bus Stand | Lat/Lng auto-populates; landmark optional. |
| **4** | Type description of deep pothole | Real-time character counter tracks input. |
| **5** | Submit complaint | Image uploads to storage, `submit-report` invoked. |
| **6** | View Success Screen | Code generated (e.g. `CIV-00001`), AI tags, priority score. |
| **7** | Submit 2nd complaint nearby | Rephrased text at same location. |
| **8** | View Duplicate Alert | System detects duplicate $\ge 70\%$, links to primary, preserves both rows. |
| **9** | Open `/admin/login` | Sign in with your provisioned municipal officer credentials. |
| **10** | Overview Dashboard | Priority donut, category bars, 14-day line chart update. |
| **11** | Hotspot Map / List | DBSCAN groups 3+ incidents $\le 250\text{m}$ (*"Possible infrastructure issue"*). |
| **12** | AI Civic Action Brief | Click **Regenerate** to synthesize actionable officer briefing. |
| **13** | Reports Table & Drawer | Filter by category/priority; assign department to **Roads**, update status to **In Progress** with note. |
| **14** | Open `/track` as Citizen | Search `CIV-00001` — live timeline reflects department assignment & officer notes in real time. |
