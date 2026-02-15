-- ======================================================================================
-- Title: ai_chat_logs 增加 LLM 欄位並寫入模擬對話
-- Date: 2026-02-16
-- Description: 對應 ai_api_keys 的 provider（openai, anthropic, gemini, deepseek, grok）
--              content 為 messages 陣列：{ "messages": [ { "role": "user"|"assistant", "content": "..." } ] }
-- ======================================================================================

-- 1. 新增欄位（與現有 LLM 設定一致）
ALTER TABLE public.ai_chat_logs
  ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'grok')),
  ADD COLUMN IF NOT EXISTS model_id TEXT;

COMMENT ON COLUMN public.ai_chat_logs.session_id IS '同一段對話的 session';
COMMENT ON COLUMN public.ai_chat_logs.provider IS 'LLM 供應商，對應 ai_api_keys.provider';
COMMENT ON COLUMN public.ai_chat_logs.model_id IS '模型 ID，如 gpt-4, claude-3-opus, gemini-pro';
COMMENT ON COLUMN public.ai_chat_logs.content IS 'JSON: { "messages": [ { "role": "user"|"assistant", "content": "..." } ] }';

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_session ON public.ai_chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_provider ON public.ai_chat_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_created_at ON public.ai_chat_logs(created_at DESC);

-- 2. 寫入模擬 User / AI 對話（測試用戶、各 provider 範例）
DO $$
DECLARE
  uid UUID := '2cd70d9d-9d84-4d2a-9848-df5b3898e4c4';
  sid UUID;
  openai_sid UUID;  -- 供後續同一 session 續聊使用
BEGIN
  -- 對話 1：OpenAI GPT-4，租約諮詢
  sid := gen_random_uuid();
  openai_sid := sid;
  INSERT INTO public.ai_chat_logs (user_id, session_id, provider, model_id, content, created_at)
  VALUES (
    uid, sid, 'openai', 'gpt-4',
    jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', '我想把租約改成一年一簽，合約裡要注意哪些條款？'),
        jsonb_build_object('role', 'assistant', 'content', '一年一簽的租約建議注意：1) 租期起訖日與續約通知期限（多數為 30–60 天前書面通知）。2) 租金調整方式（是否隨物價或固定比例）。3) 押金與提前解約條件（例如違約金、搬離通知期）。4) 修繕責任歸屬（結構 vs 設備）。5) 不得轉租或分租的約定。建議用制式契約並請律師過目後再簽。')
      )
    ),
    NOW() - interval '2 hours'
  );

  -- 對話 2：Anthropic Claude，售屋稅務
  sid := gen_random_uuid();
  INSERT INTO public.ai_chat_logs (user_id, session_id, provider, model_id, content, created_at)
  VALUES (
    uid, sid, 'anthropic', 'claude-3-opus-20240229',
    jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', '賣掉自用住宅要繳多少稅？有節稅方式嗎？'),
        jsonb_build_object('role', 'assistant', 'content', '自用住宅若符合「一生一屋」或「一生一次」土地增值稅優惠，可享 10% 稅率。房地合一 2.0 下，自住滿 6 年且設籍可享 400 萬免稅額與 10% 稅率。節稅可考慮：符合自住條件、善用重購退稅（先買後賣或先賣後買）、保留裝潢與取得成本單據以正確計算所得。建議依實際持有期間與設籍情形試算，或請會計師協助。')
      )
    ),
    NOW() - interval '1 day'
  );

  -- 對話 3：Gemini，物件描述生成
  sid := gen_random_uuid();
  INSERT INTO public.ai_chat_logs (user_id, session_id, provider, model_id, content, created_at)
  VALUES (
    uid, sid, 'gemini', 'gemini-pro',
    jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', '幫我寫一段 3 房 2 廳、近捷運的出租文案，約 80 字。'),
        jsonb_build_object('role', 'assistant', 'content', '【近捷運 3 房 2 廳 溫馨成家】步行 5 分鐘抵捷運站，採光佳、格局方正。主臥+兩間次臥，客餐廳分離，衛浴開窗。社區有管理、垃圾集中。適合小家庭或上班族，歡迎預約看屋。')
      )
    ),
    NOW() - interval '3 hours'
  );

  -- 對話 4：DeepSeek，多輪問答（維修責任）
  sid := gen_random_uuid();
  INSERT INTO public.ai_chat_logs (user_id, session_id, provider, model_id, content, created_at)
  VALUES (
    uid, sid, 'deepseek', 'deepseek-chat',
    jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', '房客說冷氣不冷，誰要出錢修？'),
        jsonb_build_object('role', 'assistant', 'content', '一般以租約為準：若為「附屬設備自然損壞」多由房東負擔；若為房客使用不當或未定期清洗濾網導致，可約定由房客負擔。建議租約中明訂「修繕責任」與「報修流程」，並保留報修紀錄與報價單。'),
        jsonb_build_object('role', 'user', 'content', '那如果是馬桶堵塞呢？'),
        jsonb_build_object('role', 'assistant', 'content', '馬桶堵塞若為正常使用造成（管線老舊、異物），通常由房東負責；若為房客丟入不當物品（如濕紙巾、異物）則可要求房客負擔。建議先請水電師傅判定原因並留下單據，再依約處理。')
      )
    ),
    NOW() - interval '5 hours'
  );

  -- 對話 5：Grok，市場行情
  sid := gen_random_uuid();
  INSERT INTO public.ai_chat_logs (user_id, session_id, provider, model_id, content, created_at)
  VALUES (
    uid, sid, 'grok', 'grok-2',
    jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', '台北市大安區 40 坪中古屋，現在大概一坪多少？'),
        jsonb_build_object('role', 'assistant', 'content', '大安區中古屋依屋齡、樓層與路段差異大，目前行情約每坪 90～120 萬不等，捷運沿線或學區佳可能更高。建議以實價登錄同路段、相近坪數與屋齡做比價，或委託在地房仲做估價。')
      )
    ),
    NOW() - interval '30 minutes'
  );

  -- 同一 session 多則（OpenAI 續聊）
  INSERT INTO public.ai_chat_logs (user_id, session_id, provider, model_id, content, created_at)
  VALUES (
    uid, openai_sid, 'openai', 'gpt-4',
    jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', '那押金兩個月合理嗎？'),
        jsonb_build_object('role', 'assistant', 'content', '依《租賃住宅市場發展及管理條例》，押金不得超過「兩個月租金總額」，所以兩個月押金是合法的上限，實務上很常見。記得在租約中寫明押金金額、返還時機與扣除條件（例如損壞、欠租），並保留收據。')
      )
    ),
    NOW() - interval '29 minutes'
  );

  RAISE NOTICE 'ai_chat_logs: 已新增 LLM 欄位並寫入 6 筆模擬對話（openai/anthropic/gemini/deepseek/grok）';
END $$;
