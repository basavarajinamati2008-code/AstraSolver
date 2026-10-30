-- ============================================================
-- CivicPulse AI — Initial Database Migration
-- Run via: supabase db push  OR  paste into Supabase SQL Editor
-- ============================================================

-- ── Sequence for complaint codes (CIV-00001, CIV-00002, …) ──────────────────
CREATE SEQUENCE IF NOT EXISTS complaint_code_seq START 1 INCREMENT 1;

-- ── reports table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_code       text UNIQUE NOT NULL,
  description          text NOT NULL,
  image_url            text,

  -- What citizen selected vs what AI assigned
  user_category        text NOT NULL DEFAULT 'Other',
  category             text,         -- AI-assigned, may differ from user_category

  -- AI analysis fields
  ai_summary           text,
  safety_risk          text CHECK (safety_risk IN ('Low', 'Medium', 'High')),
  urgency              text CHECK (urgency IN ('Low', 'Medium', 'High')),
  public_impact        text CHECK (public_impact IN ('Low', 'Medium', 'High')),
  keywords             text[],
  priority_score       int CHECK (priority_score BETWEEN 0 AND 100),
  priority_level       text CHECK (priority_level IN ('Low', 'Medium', 'High', 'Critical')),
  priority_breakdown   jsonb,        -- {safety, impact, urgency, affected, total}
  priority_explanation text,
  recommended_action   text,

  -- Location
  latitude             double precision NOT NULL,
  longitude            double precision NOT NULL,
  location_text        text,         -- optional landmark description
  affected_count       int NOT NULL DEFAULT 1,

  -- Duplicate detection
  duplicate_of         uuid REFERENCES reports(id) ON DELETE SET NULL,
  duplicate_confidence numeric,
  duplicate_reason     text,

  -- Workflow
  status               text NOT NULL DEFAULT 'Submitted'
                        CHECK (status IN ('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved')),
  assigned_department  text,

  -- AI processing status
  ai_status            text NOT NULL DEFAULT 'pending'
                        CHECK (ai_status IN ('pending', 'success', 'failed')),
  ai_error             text,

  -- Flags
  is_synthetic         boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── report_updates table (status history) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status   text,
  new_status   text,
  action_note  text,
  updated_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── briefs table (cached AI civic brief) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text         text NOT NULL,
  stats_used   jsonb NOT NULL DEFAULT '{}',
  report_count int NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_status       ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority     ON reports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category     ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at   ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_duplicate_of ON reports(duplicate_of);
CREATE INDEX IF NOT EXISTS idx_reports_location     ON reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_report_updates_report ON report_updates(report_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs         ENABLE ROW LEVEL SECURITY;

-- Authenticated (admin) can do everything on reports
CREATE POLICY "admin_reports_all" ON reports
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated (admin) can insert report_updates
CREATE POLICY "admin_report_updates_all" ON report_updates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated (admin) can read briefs
CREATE POLICY "admin_briefs_read" ON briefs
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated (admin) can insert briefs (via Edge Function service role, so this is belt-and-suspenders)
CREATE POLICY "admin_briefs_insert" ON briefs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Anonymous users: NO direct access to reports or report_updates
-- (they use SECURITY DEFINER RPCs below)

-- ── RPC: track_report ─────────────────────────────────────────────────────────
-- SECURITY DEFINER: runs as the DB owner, bypasses RLS.
-- Returns only citizen-safe fields for one report by complaint code.
-- Cannot be used to list/scan other reports.
CREATE OR REPLACE FUNCTION track_report(code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id',                  r.id,
    'complaint_code',      r.complaint_code,
    'description',         r.description,
    'user_category',       r.user_category,
    'category',            r.category,
    'ai_summary',          r.ai_summary,
    'status',              r.status,
    'assigned_department', r.assigned_department,
    'location_text',       r.location_text,
    'affected_count',      r.affected_count,
    'ai_status',           r.ai_status,
    'created_at',          r.created_at,
    'updated_at',          r.updated_at,
    'updates', (
      SELECT json_agg(
        json_build_object(
          'id',          u.id,
          'report_id',   u.report_id,
          'old_status',  u.old_status,
          'new_status',  u.new_status,
          'action_note', u.action_note,
          'updated_by',  u.updated_by,
          'created_at',  u.created_at
        ) ORDER BY u.created_at ASC
      )
      FROM report_updates u
      WHERE u.report_id = r.id
    )
  )
  INTO result
  FROM reports r
  WHERE r.complaint_code = upper(trim(code));

  RETURN result;
END;
$$;

-- ── RPC: public_stats ─────────────────────────────────────────────────────────
-- Returns aggregate counts only — safe for the landing page.
CREATE OR REPLACE FUNCTION public_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total',    COUNT(*),
    'resolved', COUNT(*) FILTER (WHERE status = 'Resolved'),
    'avg_resolution_hours',
      EXTRACT(EPOCH FROM AVG(
        CASE WHEN status = 'Resolved'
          THEN updated_at - created_at
          ELSE NULL
        END
      )) / 3600.0
  )
  INTO result
  FROM reports;

  RETURN result;
END;
$$;

-- Grant execute on RPCs to anonymous (anon role) so the public app can call them
GRANT EXECUTE ON FUNCTION track_report(text) TO anon;
GRANT EXECUTE ON FUNCTION public_stats()     TO anon;

-- ── Storage bucket policies ───────────────────────────────────────────────────
-- These are set via Supabase dashboard or CLI, not SQL.
-- See README.md for instructions.
-- Bucket: report-images
--   Public read: ON
--   Anonymous upload: allowed, max file size 5242880 bytes (5 MB),
--   allowed MIME types: image/jpeg, image/png, image/webp

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verify with:
--   SELECT * FROM reports LIMIT 1;
--   SELECT track_report('CIV-00001');
--   SELECT public_stats();
