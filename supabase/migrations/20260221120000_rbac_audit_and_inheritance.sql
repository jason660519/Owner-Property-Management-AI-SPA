-- RBAC audit logs and role inheritance support

-- Add parent_role_id for role inheritance (self-referencing FK)
ALTER TABLE iam_roles
  ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES iam_roles(id) ON DELETE SET NULL;

-- Audit log table for RBAC changes
CREATE TABLE IF NOT EXISTS rbac_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES iam_roles(id) ON DELETE SET NULL,
  role_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_role_id ON rbac_audit_logs(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_created_at ON rbac_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_action ON rbac_audit_logs(action);

-- Enable RLS
ALTER TABLE rbac_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all audit logs
CREATE POLICY "super_admin_read_rbac_audit"
  ON rbac_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM iam_group_members m
      JOIN iam_groups g ON g.id = m.group_id
      WHERE m.user_id = auth.uid()
        AND g.name = 'Administrators'
    )
  );

-- Service role can insert audit logs
CREATE POLICY "service_role_insert_rbac_audit"
  ON rbac_audit_logs FOR INSERT
  WITH CHECK (true);
