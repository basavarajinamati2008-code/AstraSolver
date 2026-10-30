# CivicPulse AI — System Limitations & Audit Log

**Hackathon Track:** PromptWars x ASTRA — AI for Civic Impact  
**Problem Statement:** "From Complaints to Action"  
**Tagline:** "From Citizen Complaints to Intelligent Civic Action."

---

## 1. Synthetic Data Notice
* **All Seed Data is Synthetic (`is_synthetic = true`):**
  * The database includes 45+ fictional civic reports spread across three distinct spatial clusters (Central Bus Stand, Market Road, and Residential Colony), plus five scattered perimeter incidents.
  * No real citizen names, personal phone numbers, or private residential addresses are collected, stored, or simulated.
  * Coordinates are mapped onto a fictional urban grid in the Maplewood/Bengaluru geographic quadrant (~`12.97°N, 77.59°E`) purely for spatial clustering, Haversine proximity calculations, and map visualization.
* **Seeded AI Fields:**
  * Reports inserted via `supabase/seed/seed.mjs` have pre-calculated AI labels (`ai_status = 'success'`) to enable immediate offline demonstration of the municipal dashboard, charts, and hotspot maps without exhausting live Gemini API quotas. Live submissions made through the portal execute the full Gemini pipeline.

---

## 2. Architectural Simplifications
* **Pairwise TF-IDF for Duplicate Detection:**
  * For runtime efficiency and zero external machine-learning dependencies within Edge Functions, text cosine similarity uses a lightweight, in-memory tokenization and IDF corpus computation rather than an external vector database (e.g., pgvector).
  * Candidate reports are pre-filtered geographically ($\le 500\text{ m}$) and temporally (past 30 days) before running pairwise cosine similarity. This keeps execution within serverless invocation limits.
* **Clustering Algorithm (DBSCAN):**
  * DBSCAN parameters are configured with $\text{eps} = 250\text{ metres}$ and $\text{minPts} = 3$ open complaints.
  * The system generates an actionable advisory notice (*"Possible infrastructure issue, inspection recommended"*) and explicitly **never claims a confirmed or proven root cause**, leaving causality to municipal engineering inspection.
* **Single Demo Administrator Account:**
  * Supabase Auth is configured for municipal operations-center roles. Fine-grained department-level role-based access control (RBAC) across distinct municipal sub-agencies is documented for post-hackathon scale.

---

## 3. AI Capabilities & Caveats
* **AI Output as Recommendation:**
  * In strict compliance with civic engineering best practices, every AI-produced recommendation, urgency rating, safety score, and civic brief is labeled with the badge:  
    $$\text{"AI-generated — verify"}$$
  * Municipal officers must conduct field verification before dispatching capital-intensive repairs or structural interventions.
* **Graceful Failure State (No Hallucinations):**
  * If the Gemini API key is unset, rate-limited, or returns an error, the system **never invents fake metrics or synthetic categories**.
  * The incident is registered with `ai_status = 'failed'`, the exact error is logged in `ai_error`, the citizen's self-selected category is preserved, priority is set to `"Needs manual review"`, and the citizen receives the transparent notification:  
    *"Submitted. AI analysis unavailable; an officer will review manually."*

---

## 4. Known Bugs & Edge Conditions
1. **Network Sandbox Boundary in Local Dev:**
   * In sandbox-restricted local environments with no public internet access, running `npm install` requires running outside the sandbox to reach `registry.npmjs.org`. A self-contained Node test suite (`node tests/runner.mjs`) is provided to verify pure mathematical and algorithmic correctness independently of network dependencies.
2. **Duplicate Transitive Merges:**
   * If Report C is a duplicate of Report B, and Report B is a duplicate of Report A, our cycle-safe `findPrimary` resolver correctly points C to root A. However, rows are never automatically deleted or irreversibly merged, preserving full legal traceability for every citizen submission.
3. **Map Tiles Offline Fallback:**
   * OpenStreetMap tiles require client-side web connectivity. If offline, the Leaflet map container remains fully interactive with clickable lat/lng pin placement and manual coordinate inputs.

---

## 5. Security Posture & Access Controls
* **Row-Level Security (RLS) Boundaries:**
  * Direct table `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `reports` and `report_updates` are explicitly forbidden for the `anon` role.
  * Public citizen access is restricted to two hardened `SECURITY DEFINER` RPCs:
    * `public_stats()`: Computes mathematical aggregates in-database; returns only numeric counters without exposing raw rows or PII.
    * `track_report(code)`: Scopes query strictly to the exact complaint code provided, returning sanitized workflow fields and stripping internal audit identifiers.
* **Administrative Edge Function Protection:**
  * `hotspots` and `civic-brief` require a verified user Bearer JWT (`Authorization: Bearer <token>`). Unauthenticated callers receive `401 Unauthorized` responses to protect sensitive municipal geospatial intelligence and prevent unauthorized Gemini quota exhaustion.
* **Public Abuse & Rate Limiting (`submit-report`):**
  * `submit-report` is protected by an in-memory sliding window rate limiter capping submissions to **10 requests per 5 minutes per IP address** (HTTP 429).
  * Payload validation enforces a 10 to 2,000 character description limit, validates categories against an explicit whitelist, bounds coordinates to valid spherical limits, and restricts images to JPEG/PNG/WebP format under 5 MB.
* **Credential Isolation & Rotation Policy:**
  * No secrets, service-role keys, or administrative passwords are committed to git or bundled in client-side artifacts.
  * Municipal administrator accounts must be provisioned individually via the **Supabase Auth Dashboard** (Users -> Invite/Add User) or via the Supabase Admin API. Any previous demo password must be invalidated by creating a dedicated account and removing unneeded demo users.
