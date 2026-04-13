-- Row 137: VIS 同步基礎設施
-- Creates paperclip_webhook_logs and sync_conflicts tables for the
-- VIS ↔ Roadmap bidirectional sync framework.

-- ── 1. paperclip_webhook_logs ─────────────────────────────────────────
-- Event queue for incoming Paperclip webhook events. Webhook handler
-- writes here immediately (status='pending') and returns 202. A cron
-- worker consumes pending rows asynchronously.

CREATE TABLE IF NOT EXISTS paperclip_webhook_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type      TEXT NOT NULL,
  issue_id        TEXT NOT NULL,
  issue_key       TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','processed','failed','skipped')),
  error_message   TEXT,
  attempt_count   INT NOT NULL DEFAULT 0,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status
  ON paperclip_webhook_logs(status)
  WHERE status IN ('pending','processing','failed');

CREATE INDEX IF NOT EXISTS idx_webhook_logs_issue_key
  ON paperclip_webhook_logs(issue_key);

ALTER TABLE paperclip_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (webhook handler and cron worker both use service_role).
CREATE POLICY "Service role full access on webhook logs"
  ON paperclip_webhook_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read logs (for debugging / audit trail in the UI).
CREATE POLICY "Authenticated users can read webhook logs"
  ON paperclip_webhook_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_webhook_logs_updated_at
  BEFORE UPDATE ON paperclip_webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();

-- ── 2. sync_conflicts ─────────────────────────────────────────────────
-- Records detected conflicts between local roadmap state and Paperclip
-- event payloads. Conflicts are visible in the Superadmin UI for
-- human review; resolution_note captures how they were handled.

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name    TEXT NOT NULL,
  vis_issue_key   TEXT NOT NULL,
  conflict_type   TEXT NOT NULL
                  CHECK (conflict_type IN (
                    'percentage_mismatch',
                    'status_mismatch',
                    'stale_event',
                    'missing_feature'
                  )),
  local_value     JSONB,
  remote_value    JSONB,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolution_note TEXT,
  webhook_log_id  UUID REFERENCES paperclip_webhook_logs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved
  ON sync_conflicts(resolved, created_at)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_issue_key
  ON sync_conflicts(vis_issue_key);

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sync conflicts"
  ON sync_conflicts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read sync conflicts"
  ON sync_conflicts FOR SELECT
  TO authenticated
  USING (true);

-- Admins can mark conflicts as resolved.
CREATE POLICY "Authenticated users can update sync conflicts"
  ON sync_conflicts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_sync_conflicts_updated_at
  BEFORE UPDATE ON sync_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();

-- ── 3. Engineer Profile V2 — add hourly_rate & max_concurrent_tasks ──
-- Extends the existing engineer_profiles table (created in 20260413190000)
-- to support task assignment optimization in Row 138+.

ALTER TABLE engineer_profiles
  ADD COLUMN IF NOT EXISTS hourly_rate          NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks INT NOT NULL DEFAULT 2;
