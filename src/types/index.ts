// Shared TypeScript types used across the entire app.
// Keep in sync with the database schema in supabase/migrations/.

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'
export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved'
export type RiskLevel = 'Low' | 'Medium' | 'High'
export type AiStatus = 'pending' | 'success' | 'failed'

export const CATEGORIES = [
  'Road Damage',
  'Waterlogging',
  'Garbage',
  'Streetlight',
  'Water Supply',
  'Drainage',
  'Public Safety',
  'Other',
] as const
export type Category = typeof CATEGORIES[number]

export const DEPARTMENTS = [
  'Roads',
  'Water Board',
  'Sanitation',
  'Electricity',
  'Drainage',
  'Police/Public Safety',
  'Other',
] as const
export type Department = typeof DEPARTMENTS[number]

export const STATUSES: ReportStatus[] = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
]

// Priority breakdown stored as JSONB in DB
export interface PriorityBreakdown {
  safety: number        // points from safety_risk
  impact: number        // points from public_impact
  urgency: number       // points from urgency
  affected: number      // points from affected_count
  total: number
}

// Main report row (matches DB schema)
export interface Report {
  id: string
  complaint_code: string
  description: string
  image_url: string | null
  user_category: string       // what citizen selected
  category: string | null     // AI-assigned (may differ)
  ai_summary: string | null
  safety_risk: RiskLevel | null
  urgency: RiskLevel | null
  public_impact: RiskLevel | null
  keywords: string[] | null
  priority_score: number | null
  priority_level: Priority | null
  priority_breakdown: PriorityBreakdown | null
  priority_explanation: string | null
  recommended_action: string | null
  latitude: number
  longitude: number
  location_text: string | null
  affected_count: number
  duplicate_of: string | null
  duplicate_confidence: number | null
  duplicate_reason: string | null
  status: ReportStatus
  assigned_department: string | null
  ai_status: AiStatus
  ai_error: string | null
  is_synthetic: boolean
  created_at: string
  updated_at: string
}

// Status history row
export interface ReportUpdate {
  id: string
  report_id: string
  old_status: string | null
  new_status: string | null
  action_note: string | null
  updated_by: string | null
  created_at: string
}

// Response from track_report RPC (citizen-safe fields only)
export interface TrackResult {
  id: string
  complaint_code: string
  description: string
  user_category: string
  category: string | null
  ai_summary: string | null
  status: ReportStatus
  assigned_department: string | null
  location_text: string | null
  affected_count: number
  ai_status: AiStatus
  created_at: string
  updated_at: string
  updates: ReportUpdate[]
}

// Response from submit-report Edge Function
export interface SubmitReportResponse {
  complaint_code: string
  category: string | null
  summary: string | null
  priority_score: number | null
  priority_level: Priority | null
  ai_status: AiStatus
  duplicate_of: string | null
  duplicate_confidence: number | null
  duplicate_reason: string | null
}

// Hotspot from hotspots Edge Function
export interface Hotspot {
  id: number
  centre_lat: number
  centre_lng: number
  radius_m: number
  count: number
  dominant_category: string
  category_counts: Record<string, number>
  avg_priority: number
  label: string | null
  wording: string
}

// Civic brief
export interface CivicBrief {
  id: string
  text: string
  stats_used: Record<string, unknown>
  report_count: number
  generated_at: string
}

// Public stats from public_stats RPC
export interface PublicStats {
  total: number
  resolved: number
  avg_resolution_hours: number | null
}
