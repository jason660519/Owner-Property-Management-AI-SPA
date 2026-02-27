-- IAM Role Permissions Table
-- Stores which actions each role can perform on each resource

CREATE TABLE IF NOT EXISTS public.iam_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.iam_roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL CHECK (char_length(resource) > 0),
  actions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, resource)
);

-- Index for fast lookup by role
CREATE INDEX IF NOT EXISTS idx_iam_role_permissions_role_id ON iam_role_permissions(role_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_iam_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_iam_role_permissions_updated_at
  BEFORE UPDATE ON iam_role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_iam_role_permissions_updated_at();

-- Enable RLS
ALTER TABLE iam_role_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can read/write all permissions
CREATE POLICY "super_admin_manage_role_permissions"
  ON iam_role_permissions FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Authenticated users can read permissions (needed for frontend RLS checks)
CREATE POLICY "authenticated_read_role_permissions"
  ON iam_role_permissions FOR SELECT
  TO authenticated
  USING (true);
