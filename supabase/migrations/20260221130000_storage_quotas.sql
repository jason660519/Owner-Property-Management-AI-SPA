-- Storage quotas table for per-user storage limit management

CREATE TABLE IF NOT EXISTS storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_bytes BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB default
  used_bytes BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  set_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT storage_quotas_user_id_key UNIQUE (user_id)
);

-- Index for lookup by user
CREATE INDEX IF NOT EXISTS idx_storage_quotas_user_id ON storage_quotas(user_id);

-- Enable RLS
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all quotas
CREATE POLICY "super_admin_manage_storage_quotas"
  ON storage_quotas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM iam_group_members m
      JOIN iam_groups g ON g.id = m.group_id
      WHERE m.user_id = auth.uid()
        AND g.name = 'Administrators'
    )
  );

-- Users can read their own quota
CREATE POLICY "users_read_own_quota"
  ON storage_quotas FOR SELECT
  USING (user_id = auth.uid());

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_storage_quotas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER storage_quotas_updated_at
  BEFORE UPDATE ON storage_quotas
  FOR EACH ROW EXECUTE FUNCTION update_storage_quotas_updated_at();
