# CivicPulse AI — API Reference & Integration Guide

All backend services are exposed via Supabase Edge Functions (Deno runtime) and PostgreSQL SECURITY DEFINER RPCs.

---

## 1. Authentication & Security Headers

| Header | Description | Required On |
|---|---|---|
| `apikey` | Supabase Public Anonymous Key (`VITE_SUPABASE_ANON_KEY`) | All Endpoints |
| `Authorization` | Municipal Officer Session Token (`Bearer <JWT>`) | `hotspots`, `civic-brief` |
| `Content-Type` | `application/json` | POST requests |

---

## 2. Endpoints

### 2.1 `POST /functions/v1/submit-report`
* **Access:** Public (Citizen)
* **Rate Limit:** 10 requests per 5-minute sliding window per IP address
* **Description:** Ingests a new citizen complaint, runs schema validation, triggers Gemini structured analysis, executes spatial duplicate detection within 500m, calculates priority score, and persists records.

#### Request Headers
```http
POST /functions/v1/submit-report HTTP/1.1
Host: <SUPABASE_PROJECT_ID>.supabase.co
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

#### Request Body
```json
{
  "description": "Large deep pothole opposite Central Bus Stand main gate. Two scooter riders fell down today.",
  "user_category": "Road Damage",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "location_text": "Central Bus Stand Main Gate",
  "affected_count": 8,
  "image_url": "https://<SUPABASE_PROJECT_ID>.supabase.co/storage/v1/object/public/report-images/pothole-1.jpg"
}
```

#### Success Response (HTTP 200)
```json
{
  "complaint_code": "CIV-00001",
  "category": "Road Damage",
  "summary": "Dangerous pothole at Central Bus Stand main gate causing vehicle crashes.",
  "priority_score": 96,
  "priority_level": "Critical",
  "ai_status": "success",
  "duplicate_of": null,
  "duplicate_confidence": null,
  "duplicate_reason": null
}
```

#### Duplicate Detected Response (HTTP 200)
```json
{
  "complaint_code": "CIV-00002",
  "category": "Road Damage",
  "summary": "Crater hole near bus stand entrance.",
  "priority_score": 88,
  "priority_level": "Critical",
  "ai_status": "success",
  "duplicate_of": "CIV-00001",
  "duplicate_confidence": 0.833,
  "duplicate_reason": "Same category (Road Damage), 35 m apart, 72% text similarity"
}
```

#### Error Responses
* **HTTP 400 Bad Request (Invalid Input / Rate Cap):**
  ```json
  {
    "error": "Invalid input",
    "details": {
      "fieldErrors": {
        "description": ["Description exceeds 2000 characters limit"]
      }
    }
  }
  ```
* **HTTP 429 Too Many Requests (Rate Limit Exceeded):**
  ```json
  {
    "error": "Rate limit exceeded. Too many complaints submitted from this address.",
    "retry_after_seconds": 240
  }
  ```

#### Example cURL
```bash
curl -X POST "https://<PROJECT_ID>.supabase.co/functions/v1/submit-report" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Broken streetlight pole with exposed wires sparking near park gate.",
    "user_category": "Public Safety",
    "latitude": 12.9750,
    "longitude": 77.6010,
    "affected_count": 5
  }'
```

---

### 2.2 `GET /functions/v1/hotspots`
* **Access:** Protected (Municipal Staff Only — requires valid Bearer JWT)
* **Description:** Runs DBSCAN spatial clustering (`eps = 250m`, `minPts = 3`) over open civic complaints. Returns spatial cluster bounding centroids, radii, dominant categories, and non-causal inspection advisories.

#### Request Headers
```http
GET /functions/v1/hotspots HTTP/1.1
Host: <SUPABASE_PROJECT_ID>.supabase.co
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_ACCESS_TOKEN>
```

#### Success Response (HTTP 200)
```json
[
  {
    "id": 0,
    "centre_lat": 12.9716,
    "centre_lng": 77.5946,
    "radius_m": 85.4,
    "count": 4,
    "dominant_category": "Road Damage",
    "category_counts": {
      "Road Damage": 3,
      "Waterlogging": 1
    },
    "avg_priority": 91.5,
    "label": "Central Bus Stand",
    "wording": "Possible infrastructure issue, inspection recommended"
  }
]
```

#### Error Response (HTTP 401 Unauthorized)
```json
{
  "error": "Unauthorized: Municipal staff authentication required to access hotspot geospatial data.",
  "details": "Missing or invalid Authorization header"
}
```

#### Example cURL
```bash
curl -X GET "https://<PROJECT_ID>.supabase.co/functions/v1/hotspots" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

---

### 2.3 `POST /functions/v1/civic-brief`
* **Access:** Protected (Municipal Staff Only — requires valid Bearer JWT)
* **Description:** Synthesizes high-level municipal statistics, keyword distributions, and active hotspots into an actionable 60-second officer brief using Google Gemini. Caches result in the `briefs` table.

#### Request Headers
```http
POST /functions/v1/civic-brief HTTP/1.1
Host: <SUPABASE_PROJECT_ID>.supabase.co
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_ACCESS_TOKEN>
```

#### Success Response (HTTP 200)
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "text": "• High Priority Alert: 8 critical incidents currently open across arterial sectors.\n• Hotspot 1 (Central Bus Stand): Compound road cratering and water accumulation blocking commuter transit.\n• Recommended Action: Deploy emergency asphalt patch team and high-volume suction pumps to Bus Stand Main Gate.\n• Utilities Alert: Coordinate with Water Board for Residential Colony main pressure valve restoration.",
  "stats_used": {
    "total_reports": 48,
    "critical_count": 8,
    "open_count": 34
  },
  "report_count": 48,
  "generated_at": "2026-10-30T16:30:00.000Z"
}
```

#### Example cURL
```bash
curl -X POST "https://<PROJECT_ID>.supabase.co/functions/v1/civic-brief" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <OFFICER_JWT_TOKEN>"
```

---

## 3. Public Database RPCs (PostgreSQL)

### 3.1 `POST /rest/v1/rpc/track_report`
* **Access:** Public (Citizen)
* **Body:** `{"code": "CIV-00001"}`
* **Returns:** Single complaint status record with timeline updates. Bypasses RLS via `SECURITY DEFINER` while stripping internal officer IDs and other complaints.

### 3.2 `POST /rest/v1/rpc/public_stats`
* **Access:** Public (Citizen)
* **Body:** `{}`
* **Returns:** Aggregate metrics only:
  ```json
  {
    "total": 48,
    "resolved": 14,
    "avg_resolution_hours": 26.4
  }
  ```
