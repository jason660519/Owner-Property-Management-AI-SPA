-- Row 135 P2: Multi-engineer collaboration
-- 1) engineer_profiles — each engineer's display name, preferred IDE, default role
-- 2) paperclip_tasks gains claimed_by / claimed_at for task locking

-- ── 1. Engineer profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engineer_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  preferred_ide   TEXT DEFAULT '',
  default_role    TEXT DEFAULT '',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE engineer_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read profiles (needed for assignee dropdown).
CREATE POLICY "Authenticated users can read engineer profiles"
  ON engineer_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users manage their own profile.
CREATE POLICY "Users can manage own engineer profile"
  ON engineer_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access.
CREATE POLICY "Service role full access on engineer profiles"
  ON engineer_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reuse the existing updated_at trigger function.
CREATE TRIGGER trg_engineer_profiles_updated_at
  BEFORE UPDATE ON engineer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();

-- ── 2. Add claim columns to paperclip_tasks ───────────────────────────
ALTER TABLE paperclip_tasks
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
