-- Add assignee columns to contact_messages
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS assignee_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_name TEXT;

-- Notes / reply records for each contact lead
CREATE TABLE IF NOT EXISTS contact_lead_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL CHECK (char_length(content) > 0),
  note_type   TEXT NOT NULL DEFAULT 'note' CHECK (note_type IN ('note', 'reply', 'internal')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_lead_notes_lead_id ON contact_lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_lead_notes_author_id ON contact_lead_notes(author_id);

-- RLS: only service_role (superadmin uses admin client) can access these tables
ALTER TABLE contact_lead_notes ENABLE ROW LEVEL SECURITY;

-- Superadmin bypasses RLS via service_role key; no explicit policies needed for authenticated role
-- since all superadmin operations use createAdminClient (service_role).
