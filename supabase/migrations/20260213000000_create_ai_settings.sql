-- filepath: supabase/migrations/20260213000000_create_ai_settings.sql
-- description: Create tables for superadmin AI settings management
-- created: 2026-02-13
-- creator: Copilot

-- ============================================================================
-- 1. ai_api_keys: Stores encrypted API keys for LLM providers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'gemini', 'deepseek', 'grok'
    )),
    api_key_encrypted TEXT NOT NULL,
    iv TEXT NOT NULL,
    is_valid BOOLEAN DEFAULT NULL,
    last_validated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_api_keys_user_id ON public.ai_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider ON public.ai_api_keys(provider);
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_ai_key_per_provider
    ON public.ai_api_keys(user_id, provider)
    WHERE (is_active = true);

ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can manage AI API keys" ON public.ai_api_keys;
CREATE POLICY "Superadmin can manage AI API keys"
    ON public.ai_api_keys FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. ai_model_selections: Stores selected models per provider (multi-select)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_model_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN (
        'openai', 'anthropic', 'gemini', 'deepseek', 'grok'
    )),
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_model_selections_user_id ON public.ai_model_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_selections_provider ON public.ai_model_selections(provider);

ALTER TABLE public.ai_model_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can manage AI model selections" ON public.ai_model_selections;
CREATE POLICY "Superadmin can manage AI model selections"
    ON public.ai_model_selections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. ai_feature_modules: Stores enabled feature modules and their config
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_feature_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL CHECK (module_key IN (
        'online_ocr', 'local_ocr', 'web_assistant',
        'contract_assistant', 'blog_generator', 'ad_generator'
    )),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    assigned_provider TEXT,
    assigned_model TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feature_modules_user_id ON public.ai_feature_modules(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_feature_module_per_user
    ON public.ai_feature_modules(user_id, module_key);

ALTER TABLE public.ai_feature_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can manage AI feature modules" ON public.ai_feature_modules;
CREATE POLICY "Superadmin can manage AI feature modules"
    ON public.ai_feature_modules FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. ai_system_prompts: Stores system prompts for each feature module
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    provider TEXT NOT NULL,
    prompt_name TEXT NOT NULL DEFAULT 'default',
    prompt_content TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_system_prompts_user_id ON public.ai_system_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_system_prompts_module ON public.ai_system_prompts(module_key);

ALTER TABLE public.ai_system_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can manage AI system prompts" ON public.ai_system_prompts;
CREATE POLICY "Superadmin can manage AI system prompts"
    ON public.ai_system_prompts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. ai_usage_logs: Tracks API usage for monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    module_key TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd NUMERIC(10,6) DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin can view AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Superadmin can view AI usage logs"
    ON public.ai_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "System can insert AI usage logs"
    ON public.ai_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Triggers for auto-updating updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_api_keys_updated_at ON public.ai_api_keys;
CREATE TRIGGER trigger_ai_api_keys_updated_at
    BEFORE UPDATE ON public.ai_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.update_ai_settings_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_model_selections_updated_at ON public.ai_model_selections;
CREATE TRIGGER trigger_ai_model_selections_updated_at
    BEFORE UPDATE ON public.ai_model_selections
    FOR EACH ROW EXECUTE FUNCTION public.update_ai_settings_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_feature_modules_updated_at ON public.ai_feature_modules;
CREATE TRIGGER trigger_ai_feature_modules_updated_at
    BEFORE UPDATE ON public.ai_feature_modules
    FOR EACH ROW EXECUTE FUNCTION public.update_ai_settings_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_system_prompts_updated_at ON public.ai_system_prompts;
CREATE TRIGGER trigger_ai_system_prompts_updated_at
    BEFORE UPDATE ON public.ai_system_prompts
    FOR EACH ROW EXECUTE FUNCTION public.update_ai_settings_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE public.ai_api_keys IS 'Encrypted API keys for LLM providers (AES-256)';
COMMENT ON TABLE public.ai_model_selections IS 'Selected AI models per provider with redundancy support';
COMMENT ON TABLE public.ai_feature_modules IS 'AI feature module configurations and assignments';
COMMENT ON TABLE public.ai_system_prompts IS 'System prompts for each feature module per provider';
COMMENT ON TABLE public.ai_usage_logs IS 'API usage tracking for monitoring and rate limiting';
