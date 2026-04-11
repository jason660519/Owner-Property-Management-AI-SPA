-- ============================================================
-- Add three application-domain role tags to ai_model_role_tags
-- so that the four remaining "empty-suggestedTagKeys" agents
-- (contract_assistant / software_dev_engineer / ttd_engineer /
--  web_assistant) can actually filter the recommendation panel.
--
-- These complement the 10 tags seeded by
-- 20260409150000_create_ai_model_role_tables.sql. After this
-- migration is applied, superadmin users can run the classify
-- flow from the Agent Config sheet to populate
-- ai_model_role_assignments rows for these new tag_keys.
-- ============================================================

INSERT INTO ai_model_role_tags (tag_key, tag_label, description, sort_order, is_system) VALUES
  (
    'legal_contract',
    '法律合約生成組',
    '擅長解析 / 生成不動產合約條款，需具備強推理與對中文法律用語的掌握度',
    11,
    true
  ),
  (
    'code_generation',
    '軟體程式碼生成組',
    '擅長 code review、重構建議、產生測試骨架；對 TypeScript / React / Supabase 生態熟悉',
    12,
    true
  ),
  (
    'general_assistant',
    '通用客服助理組',
    '網站客服聊天、常見問題回應；重視回應速度與成本，可接受較短 context',
    13,
    true
  )
ON CONFLICT (tag_key) DO NOTHING;
