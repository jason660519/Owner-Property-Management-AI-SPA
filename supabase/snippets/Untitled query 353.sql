-- 建立 ai_api_keys 資料表，用於儲存加密後的金鑰
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'gemini', 'deepseek', 'grok'
    )),
    api_key_encrypted TEXT NOT NULL, -- 這裡儲存密文
    iv TEXT NOT NULL,                -- 這裡儲存加密向量
    is_valid BOOLEAN DEFAULT NULL,
    last_validated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引以優化查詢效能
CREATE INDEX idx_ai_api_keys_user_id ON public.ai_api_keys(user_id);
CREATE UNIQUE INDEX unique_active_ai_key_per_provider
    ON public.ai_api_keys(user_id, provider)
    WHERE (is_active = true);

-- 啟用 RLS (Row Level Security) 安全性政策
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- 允許使用者管理自己的金鑰
CREATE POLICY "Superadmin can manage AI API keys"
    ON public.ai_api_keys FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);