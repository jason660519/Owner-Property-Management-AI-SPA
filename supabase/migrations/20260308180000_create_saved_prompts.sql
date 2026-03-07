-- Migration: create_saved_prompts
-- Purpose: Store named prompt templates for reuse in the global test panel

CREATE TABLE IF NOT EXISTS saved_prompts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: keep updated_at in sync
CREATE OR REPLACE FUNCTION update_saved_prompts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saved_prompts_updated_at
  BEFORE UPDATE ON saved_prompts
  FOR EACH ROW EXECUTE FUNCTION update_saved_prompts_updated_at();

-- RLS: only super_admins may access (service_role bypasses this anyway)
ALTER TABLE saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_prompts_super_admin_all"
  ON saved_prompts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM iam_user_roles ur
      JOIN iam_roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'super_admin'
    )
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
