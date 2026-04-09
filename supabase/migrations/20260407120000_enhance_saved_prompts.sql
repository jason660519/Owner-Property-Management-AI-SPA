-- Enhance saved_prompts with tags, description, and favorites support

ALTER TABLE saved_prompts
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- GIN index for efficient tag containment queries (@>)
CREATE INDEX IF NOT EXISTS idx_saved_prompts_tags
  ON saved_prompts USING GIN (tags);

-- Composite index for default ordering (favorites first, then by recency)
CREATE INDEX IF NOT EXISTS idx_saved_prompts_is_favorite
  ON saved_prompts (is_favorite DESC, updated_at DESC);
