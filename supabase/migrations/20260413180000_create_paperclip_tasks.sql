-- Paperclip task queue: tracks dispatched Paperclip issues with server-side
-- retry state so the auto-retry loop survives browser tab close.
-- Row 135 — PromptEngineer rebuild.

CREATE TABLE IF NOT EXISTS paperclip_tasks (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  row_id                TEXT NOT NULL,
  issue_id              TEXT NOT NULL,
  issue_url             TEXT NOT NULL,
  assigned_agent        TEXT,
  assigned_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_role         TEXT,
  ide                   TEXT,
  prompt_text           TEXT,
  status                TEXT NOT NULL DEFAULT 'submitted'
                        CHECK (status IN ('submitted','running','succeeded','failed','cancelled','tripped')),
  attempt_count         INT NOT NULL DEFAULT 1,
  consecutive_failures  INT NOT NULL DEFAULT 0,
  max_attempts          INT NOT NULL DEFAULT 3,
  cooldown_seconds      INT NOT NULL DEFAULT 30,
  last_error            TEXT,
  cost_usd              NUMERIC(10,6),
  worktree_slug         TEXT,
  worktree_branch       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(row_id, issue_id)
);

-- Only one active (submitted or running) task per row at any time.
-- Prevents duplicate dispatch of the same row.
CREATE UNIQUE INDEX idx_paperclip_tasks_active_row
  ON paperclip_tasks(row_id)
  WHERE status IN ('submitted','running');

-- Fast lookup for the poll endpoint.
CREATE INDEX idx_paperclip_tasks_status
  ON paperclip_tasks(status)
  WHERE status IN ('submitted','running');

-- Enable RLS.
ALTER TABLE paperclip_tasks ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all tasks (needed for multi-engineer dashboard).
CREATE POLICY "Authenticated users can read all paperclip tasks"
  ON paperclip_tasks FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own tasks.
CREATE POLICY "Users can insert own paperclip tasks"
  ON paperclip_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = assigned_by);

-- Users can update their own tasks.
CREATE POLICY "Users can update own paperclip tasks"
  ON paperclip_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_by);

-- Service role has full access (for server-side poll/retry).
CREATE POLICY "Service role full access on paperclip tasks"
  ON paperclip_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reuse the existing updated_at trigger function from dev_tasks migration.
CREATE TRIGGER trg_paperclip_tasks_updated_at
  BEFORE UPDATE ON paperclip_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();
