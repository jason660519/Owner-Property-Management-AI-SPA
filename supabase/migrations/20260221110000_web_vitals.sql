-- Web performance metrics table for Core Web Vitals tracking
-- Stores LCP, FID, CLS, TTFB, FCP per page

CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path VARCHAR(500) NOT NULL,
  lcp_ms NUMERIC,            -- Largest Contentful Paint (ms)
  fid_ms NUMERIC,            -- First Input Delay (ms)
  cls_score NUMERIC,         -- Cumulative Layout Shift (score 0-1)
  ttfb_ms NUMERIC,           -- Time to First Byte (ms)
  fcp_ms NUMERIC,            -- First Contentful Paint (ms)
  inp_ms NUMERIC,            -- Interaction to Next Paint (ms)
  connection_type TEXT,      -- '4g', '3g', 'wifi', etc.
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON web_vitals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_page_path ON web_vitals(page_path);
CREATE INDEX IF NOT EXISTS idx_web_vitals_device_type ON web_vitals(device_type);

-- Enable RLS
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Super admins can read all records
CREATE POLICY "super_admin_read_web_vitals"
  ON web_vitals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM iam_user_group_memberships m
      JOIN iam_groups g ON g.id = m.group_id
      WHERE m.user_id = auth.uid()
        AND g.name = 'super_admins'
    )
  );

-- Service role (server-side) can insert metrics
CREATE POLICY "service_role_insert_web_vitals"
  ON web_vitals FOR INSERT
  WITH CHECK (true);

-- View: page performance summary (last 7 days)
CREATE OR REPLACE VIEW web_vitals_page_summary AS
SELECT
  page_path,
  COUNT(*) AS sample_count,
  ROUND(AVG(lcp_ms)::numeric, 0) AS avg_lcp_ms,
  ROUND(AVG(fid_ms)::numeric, 0) AS avg_fid_ms,
  ROUND(AVG(cls_score)::numeric, 4) AS avg_cls,
  ROUND(AVG(ttfb_ms)::numeric, 0) AS avg_ttfb_ms,
  ROUND(AVG(fcp_ms)::numeric, 0) AS avg_fcp_ms,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp_ms)::numeric, 0) AS p75_lcp_ms
FROM web_vitals
WHERE created_at > now() - interval '7 days'
GROUP BY page_path
ORDER BY sample_count DESC;
