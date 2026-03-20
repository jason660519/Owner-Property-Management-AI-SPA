-- Migration: add property_investigation_reports table
-- Stores investigation report (不動產說明書) data per property, supports versioning

CREATE TABLE IF NOT EXISTS property_investigation_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID        NOT NULL,
  property_type   TEXT        NOT NULL CHECK (property_type IN ('sales', 'rentals')),
  version         INTEGER     NOT NULL DEFAULT 1,
  data            JSONB       NOT NULL DEFAULT '{}',
  created_by      UUID        REFERENCES users_profile(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: fast lookup of latest versions per property
CREATE INDEX IF NOT EXISTS idx_investigation_reports_property
  ON property_investigation_reports (property_id, property_type, created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_investigation_report_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_investigation_report_updated_at
  BEFORE UPDATE ON property_investigation_reports
  FOR EACH ROW EXECUTE FUNCTION update_investigation_report_updated_at();

-- RLS: only service_role (admin) can access — no public policies needed
ALTER TABLE property_investigation_reports ENABLE ROW LEVEL SECURITY;
