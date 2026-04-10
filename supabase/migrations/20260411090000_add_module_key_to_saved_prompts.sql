-- Migration: add_module_key_to_saved_prompts
-- Purpose: Make saved_prompts the SSoT for LLM system prompts by introducing
--          a stable module_key lookup column. See docs/ai-prompt-safety-guide.md
--          §2 (Prompt Single Source of Truth).
--
-- Notes:
-- 1. module_key is nullable so existing free-form prompts (without a fixed
--    module assignment) keep working unchanged.
-- 2. A partial UNIQUE index ensures at most one canonical record per module,
--    while still allowing many user-created untagged prompts.
-- 3. Actual prompt CONTENT is NOT seeded by this migration (it's too long for
--    SQL). It is seeded by the existing `seedDefaultPrompts()` server action
--    in apps/superadmin/components/prompt-management/seedDefaultPrompts.ts,
--    which runs idempotently from the prompt-management UI.

ALTER TABLE saved_prompts
  ADD COLUMN IF NOT EXISTS module_key TEXT;

-- Partial unique index: enforce one canonical row per module_key when set,
-- but allow many rows where module_key IS NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_prompts_module_key_unique
  ON saved_prompts (module_key)
  WHERE module_key IS NOT NULL;

-- Plain index for lookups by module_key.
CREATE INDEX IF NOT EXISTS idx_saved_prompts_module_key
  ON saved_prompts (module_key);

COMMENT ON COLUMN saved_prompts.module_key IS
  'Stable identifier linking this prompt to a feature module. Format: <domain>.<feature>[.<variant>], e.g. transcript.parse, property.description.default. Looked up at runtime by lib/ai/prompt-safety.ts::resolveSystemPrompt().';
