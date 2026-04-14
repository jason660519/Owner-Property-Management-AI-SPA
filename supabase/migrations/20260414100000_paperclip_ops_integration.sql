-- Paperclip Ops Integration: per-task adapter/model, cron configs, task events
-- Supports unified project-progress dashboard operations.

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Extend paperclip_tasks with per-task adapter/model snapshot
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE paperclip_tasks
  ADD COLUMN IF NOT EXISTS adapter_type   TEXT,
  ADD COLUMN IF NOT EXISTS model          TEXT,
  ADD COLUMN IF NOT EXISTS agent_id_snapshot TEXT;

COMMENT ON COLUMN paperclip_tasks.adapter_type IS 'Paperclip adapter used for this task (e.g. claude_local, codex_local)';
COMMENT ON COLUMN paperclip_tasks.model IS 'LLM model used (e.g. sonnet, gpt-5.3-codex)';
COMMENT ON COLUMN paperclip_tasks.agent_id_snapshot IS 'Paperclip agent ID at dispatch time';

CREATE INDEX IF NOT EXISTS idx_paperclip_tasks_adapter
  ON paperclip_tasks(adapter_type)
  WHERE adapter_type IS NOT NULL;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Cron job configuration table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS paperclip_cron_configs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type        TEXT NOT NULL UNIQUE
                  CHECK (job_type IN ('agent_health', 'work_summary', 'auto_dispatch')),
  enabled         BOOLEAN NOT NULL DEFAULT false,
  interval_seconds INT NOT NULL DEFAULT 300
                  CHECK (interval_seconds >= 30),
  last_run_at     TIMESTAMPTZ,
  last_result     JSONB,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE paperclip_cron_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cron configs"
  ON paperclip_cron_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update cron configs"
  ON paperclip_cron_configs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role full access on cron configs"
  ON paperclip_cron_configs FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO paperclip_cron_configs (job_type, enabled, interval_seconds) VALUES
  ('agent_health',   false, 180),
  ('work_summary',   false, 300),
  ('auto_dispatch',  false, 600)
ON CONFLICT (job_type) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Task event log (audit trail for ops actions)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS paperclip_task_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID REFERENCES paperclip_tasks(id) ON DELETE CASCADE,
  agent_id    TEXT,
  event_type  TEXT NOT NULL
              CHECK (event_type IN (
                'dispatched', 'resumed', 'paused', 'heartbeat_run',
                'cron_triggered', 'adapter_switched', 'status_changed',
                'retry', 'cancelled', 'completed'
              )),
  detail      JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON paperclip_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_agent_id ON paperclip_task_events(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_events_type ON paperclip_task_events(event_type);

ALTER TABLE paperclip_task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read task events"
  ON paperclip_task_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert task events"
  ON paperclip_task_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role full access on task events"
  ON paperclip_task_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reuse the updated_at trigger for cron_configs
CREATE TRIGGER trg_paperclip_cron_configs_updated_at
  BEFORE UPDATE ON paperclip_cron_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();
