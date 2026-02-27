-- Behavior logs table for tracking website user actions
-- Supports anomaly detection, 90-day retention, and multi-condition filtering

CREATE TABLE IF NOT EXISTS behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path VARCHAR(500) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('PAGE_VIEW', 'CLICK', 'FORM_SUBMIT', 'API_CALL')),
  ip_address INET,
  user_agent TEXT,
  is_anomaly BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_behavior_logs_created_at ON behavior_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_user_id ON behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_ip_address ON behavior_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_action_type ON behavior_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_is_anomaly ON behavior_logs(is_anomaly) WHERE is_anomaly = true;

-- Enable RLS
ALTER TABLE behavior_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all logs
CREATE POLICY "super_admin_read_behavior_logs"
  ON behavior_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM iam_user_group_memberships m
      JOIN iam_groups g ON g.id = m.group_id
      WHERE m.user_id = auth.uid()
        AND g.name = 'super_admins'
    )
  );

-- Service role (server-side) can insert logs
CREATE POLICY "service_role_insert_behavior_logs"
  ON behavior_logs FOR INSERT
  WITH CHECK (true);

-- Service role can update anomaly flag
CREATE POLICY "service_role_update_behavior_logs"
  ON behavior_logs FOR UPDATE
  USING (true);

-- Auto-cleanup function: delete logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_behavior_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM behavior_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Anomaly detection function: mark IPs with >100 requests per minute
CREATE OR REPLACE FUNCTION detect_behavior_anomalies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE behavior_logs
  SET is_anomaly = true
  WHERE id IN (
    SELECT bl.id
    FROM behavior_logs bl
    WHERE bl.ip_address IS NOT NULL
      AND bl.created_at > now() - interval '5 minutes'
      AND (
        SELECT COUNT(*)
        FROM behavior_logs bl2
        WHERE bl2.ip_address = bl.ip_address
          AND bl2.created_at > bl.created_at - interval '1 minute'
          AND bl2.created_at <= bl.created_at
      ) > 100
  );
END;
$$;

-- View: daily traffic stats (last 30 days)
CREATE OR REPLACE VIEW behavior_daily_stats AS
SELECT
  date_trunc('day', created_at)::date AS stat_date,
  COUNT(*) AS total_events,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT ip_address) AS unique_ips,
  SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END) AS anomaly_count,
  COUNT(CASE WHEN action_type = 'PAGE_VIEW' THEN 1 END) AS page_views,
  COUNT(CASE WHEN action_type = 'API_CALL' THEN 1 END) AS api_calls
FROM behavior_logs
WHERE created_at > now() - interval '30 days'
GROUP BY date_trunc('day', created_at)::date
ORDER BY stat_date DESC;
