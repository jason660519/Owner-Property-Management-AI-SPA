-- ============================================================
-- Seed ai_model_role_assignments for the three application-domain
-- role tags added by 20260412110000_add_application_role_tags.sql.
--
-- Rationale: the Agent Config panel filters recommendations by
-- `suggestedTagKeys`, which now references `legal_contract`,
-- `code_generation`, and `general_assistant`. Without any rows
-- carrying those tags, the recommendation panel is stuck showing
-- the "暫時顯示全部" bypass button instead of a curated list.
--
-- Assignments are stamped `source = 'manual'` so the next run of
-- `classifyModels (online|offline)` won't overwrite them silently —
-- the AI classifier only updates its own source rows.
--
-- Picks are common-sense based on AI_PROVIDERS pricing + each
-- model's published strengths; admins can tweak per-user via the
-- TagEditorSheet once they see these defaults in the panel.
-- ============================================================

DO $$
DECLARE
  target_user UUID;
BEGIN
  -- ai_model_role_assignments.user_id is NOT NULL — the migration
  -- created with a user scope in mind. Use the first auth user as
  -- the seed owner. If there's no user, skip the seed (CI env).
  SELECT id INTO target_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF target_user IS NULL THEN
    RAISE NOTICE 'No auth.users row found — skipping application tag seed';
    RETURN;
  END IF;

  INSERT INTO ai_model_role_assignments
    (user_id, provider, model_id, tag_key, source, confidence, classified_by)
  VALUES
    -- ── legal_contract (contract_assistant) ──
    -- Long-context, high reasoning models
    (target_user, 'anthropic', 'claude-opus-4-20250514',   'legal_contract', 'manual', 1.0, 'seed_20260412'),
    (target_user, 'anthropic', 'claude-sonnet-4-20250514', 'legal_contract', 'manual', 0.9, 'seed_20260412'),
    (target_user, 'openai',    'gpt-4o',                   'legal_contract', 'manual', 0.9, 'seed_20260412'),
    (target_user, 'gemini',    'gemini-1.5-pro',           'legal_contract', 'manual', 0.85, 'seed_20260412'),

    -- ── code_generation (software_dev_engineer + ttd_engineer) ──
    -- Strong coding/reasoning models
    (target_user, 'anthropic', 'claude-opus-4-20250514',   'code_generation', 'manual', 1.0, 'seed_20260412'),
    (target_user, 'anthropic', 'claude-sonnet-4-20250514', 'code_generation', 'manual', 0.95, 'seed_20260412'),
    (target_user, 'openai',    'gpt-4o',                   'code_generation', 'manual', 0.9, 'seed_20260412'),
    (target_user, 'deepseek',  'deepseek-chat',            'code_generation', 'manual', 0.85, 'seed_20260412'),
    (target_user, 'deepseek',  'deepseek-reasoner',        'code_generation', 'manual', 0.9, 'seed_20260412'),

    -- ── general_assistant (web_assistant) ──
    -- Cost-sensitive chat models with decent Chinese
    (target_user, 'anthropic', 'claude-sonnet-4-20250514', 'general_assistant', 'manual', 0.95, 'seed_20260412'),
    (target_user, 'anthropic', 'claude-3-5-haiku-20241022','general_assistant', 'manual', 0.9, 'seed_20260412'),
    (target_user, 'openai',    'gpt-4o',                   'general_assistant', 'manual', 0.9, 'seed_20260412'),
    (target_user, 'openai',    'gpt-4o-mini',              'general_assistant', 'manual', 0.85, 'seed_20260412'),
    (target_user, 'gemini',    'gemini-2.0-flash',         'general_assistant', 'manual', 0.85, 'seed_20260412')
  ON CONFLICT (user_id, provider, model_id, tag_key) DO NOTHING;
END $$;
