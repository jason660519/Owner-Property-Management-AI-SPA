-- Storage alerts table for quota threshold notifications

CREATE TABLE IF NOT EXISTS storage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threshold_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.75,
  used_bytes BIGINT NOT NULL,
  quota_bytes BIGINT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_alerts_user_id_triggered_at
  ON storage_alerts (user_id, triggered_at DESC);

ALTER TABLE storage_alerts ENABLE ROW LEVEL SECURITY;

-- Super admins can view and manage all alerts
CREATE POLICY "super_admin_manage_storage_alerts"
  ON storage_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM iam_group_members m
      JOIN iam_groups g ON g.id = m.group_id
      WHERE m.user_id = auth.uid()
        AND g.name = 'Administrators'
    )
  );

-- Users may read their own alerts
CREATE POLICY "users_read_own_storage_alerts"
  ON storage_alerts FOR SELECT
  USING (user_id = auth.uid());

