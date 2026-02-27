-- Dev tasks table: stores IDE/CLI development tasks triggered from the superadmin dashboard
-- and consumed by local agents running on developers' machines.

CREATE TABLE IF NOT EXISTS dev_tasks (
  id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  row_id          TEXT            NOT NULL,
  feature_name    TEXT            NOT NULL,
  ide             TEXT            NOT NULL CHECK (ide IN ('Cursor','VSCode','Antigravity','Claude CLI','TRAE')),
  prompt          TEXT            NOT NULL,
  metadata        JSONB           NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT            NOT NULL CHECK (status IN ('queued','running','succeeded','failed')),
  agent_id        TEXT,
  logs            TEXT[]          NOT NULL DEFAULT '{}'::text[],
  result_summary  JSONB,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  dev_tasks IS '開發任務佇列：由 superadmin 發出，供本地 IDE / CLI Agent 消費的任務列表';
COMMENT ON COLUMN dev_tasks.row_id       IS '對應 superadmin 開發進度表中的 Row 編號（例如 007）';
COMMENT ON COLUMN dev_tasks.ide          IS '指定要使用的 IDE / Agent 類型（Cursor / VSCode / Antigravity / Claude CLI / TRAE）';
COMMENT ON COLUMN dev_tasks.metadata     IS '附加資訊，例如 Spec URL、測試資料夾路徑等';
COMMENT ON COLUMN dev_tasks.status       IS '任務狀態：queued, running, succeeded, failed';
COMMENT ON COLUMN dev_tasks.agent_id     IS '實際執行本任務的 Local Agent 標識';

ALTER TABLE dev_tasks ENABLE ROW LEVEL SECURITY;

-- 使用者僅能讀寫自己的任務
CREATE POLICY "Users can manage own dev tasks"
  ON dev_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- service_role（例如後端批次 / LocalAgent）擁有完整權限
CREATE POLICY "Service role full access to dev tasks"
  ON dev_tasks
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_dev_tasks_user_status ON dev_tasks(user_id, status);
CREATE INDEX idx_dev_tasks_status_ide  ON dev_tasks(status, ide);

CREATE OR REPLACE FUNCTION update_dev_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dev_tasks_updated_at
  BEFORE UPDATE ON dev_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();

