-- ======================================================================================
-- Migration: Super Admin Missing Tables (Completion)
-- Date: 2026-01-30
-- Description: Completes the remaining 10 Super Admin tables that were not in the initial migration
-- ======================================================================================

-- 1. User Track History (使用者的登入歷史與使用歷史紀錄)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.users_track_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'login', 'logout', 'page_view', 'action'
    event_name TEXT, -- specific action name
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_data JSONB DEFAULT '{}', -- geolocation if available
    session_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_track_history_user_id ON public.users_track_history(user_id);
CREATE INDEX idx_users_track_history_created_at ON public.users_track_history(created_at DESC);
CREATE INDEX idx_users_track_history_event_type ON public.users_track_history(event_type);

-- 2. Tax Rates (國家稅率設定表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL, -- 'TW', 'US', 'JP'
    region_code TEXT, -- state/province code for regional tax
    tax_type TEXT NOT NULL, -- 'income', 'property', 'sales', 'vat', 'capital_gains'
    rate_percentage NUMERIC(5, 2) NOT NULL,
    description TEXT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(country_code, region_code, tax_type, effective_from)
);

CREATE INDEX idx_tax_rates_country ON public.tax_rates(country_code);
CREATE INDEX idx_tax_rates_active ON public.tax_rates(is_active) WHERE is_active = TRUE;

-- 3. Webhook Configs (Webhook 設定表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST', -- 'POST', 'PUT', 'PATCH'
    headers JSONB DEFAULT '{}',
    event_triggers TEXT[] NOT NULL, -- ['property.created', 'user.registered']
    is_active BOOLEAN DEFAULT TRUE,
    secret_key TEXT, -- for webhook signature verification
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    last_triggered_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_configs_active ON public.webhook_configs(is_active) WHERE is_active = TRUE;

-- 4. ElasticSearch Indices (ElasticSearch 索引表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.elasticsearch_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_name TEXT NOT NULL UNIQUE,
    index_type TEXT NOT NULL, -- 'properties', 'users', 'blog_posts'
    mapping_schema JSONB NOT NULL,
    settings JSONB DEFAULT '{}',
    aliases TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    last_indexed_at TIMESTAMPTZ,
    document_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Performance Metrics (效能監控指標表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.perf_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- 'api_response_time', 'db_query_time', 'cache_hit_rate'
    metric_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL, -- 'ms', 'seconds', 'percentage', 'count'
    tags JSONB DEFAULT '{}', -- {'endpoint': '/api/properties', 'method': 'GET'}
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perf_metrics_type ON public.perf_metrics(metric_type);
CREATE INDEX idx_perf_metrics_recorded_at ON public.perf_metrics(recorded_at DESC);
CREATE INDEX idx_perf_metrics_tags ON public.perf_metrics USING GIN (tags);

-- 6. Recommendation Logs (推薦系統記錄表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    recommendation_type TEXT NOT NULL, -- 'property', 'landlord', 'content'
    algorithm_used TEXT NOT NULL, -- 'collaborative_filtering', 'content_based', 'hybrid'
    input_data JSONB NOT NULL,
    recommendations JSONB NOT NULL, -- array of recommended items with scores
    user_interaction TEXT, -- 'clicked', 'ignored', 'saved'
    interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendation_logs_user_id ON public.recommendation_logs(user_id);
CREATE INDEX idx_recommendation_logs_created_at ON public.recommendation_logs(created_at DESC);

-- 7. Unit Conversion Logs (單位轉換記錄表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.unit_conversion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_type TEXT NOT NULL, -- 'area', 'currency', 'temperature'
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    from_value NUMERIC NOT NULL,
    to_value NUMERIC NOT NULL,
    conversion_rate NUMERIC NOT NULL,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    context TEXT, -- where the conversion was used
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unit_conversion_logs_type ON public.unit_conversion_logs(conversion_type);
CREATE INDEX idx_unit_conversion_logs_created_at ON public.unit_conversion_logs(created_at DESC);

-- 8. Version History (版本更新記錄表)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number TEXT NOT NULL UNIQUE, -- '1.0.0', '1.1.0'
    release_date DATE NOT NULL,
    release_type TEXT NOT NULL, -- 'major', 'minor', 'patch', 'hotfix'
    changelog JSONB NOT NULL, -- {'added': [], 'fixed': [], 'changed': [], 'removed': []}
    migration_required BOOLEAN DEFAULT FALSE,
    rollback_available BOOLEAN DEFAULT TRUE,
    deployed_by UUID REFERENCES public.users_profile(id),
    deployed_at TIMESTAMPTZ,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_version_history_release_date ON public.version_history(release_date DESC);
CREATE INDEX idx_version_history_current ON public.version_history(is_current) WHERE is_current = TRUE;

-- ======================================================================================
-- Enable RLS for all new tables
-- ======================================================================================

ALTER TABLE public.users_track_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elasticsearch_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perf_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conversion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_history ENABLE ROW LEVEL SECURITY;

-- ======================================================================================
-- Basic RLS Policies (Super Admin Only for Write, Some Public Read)
-- ======================================================================================

-- Users Track History: Super admin can view all, users can view their own
CREATE POLICY "Super admins can view all track history" ON public.users_track_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view their own track history" ON public.users_track_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert track history" ON public.users_track_history
    FOR INSERT WITH CHECK (TRUE);

-- Tax Rates: Public read, super admin write
CREATE POLICY "Anyone can view active tax rates" ON public.tax_rates
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Super admins can manage tax rates" ON public.tax_rates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Webhook Configs: Super admin only
CREATE POLICY "Super admins can manage webhook configs" ON public.webhook_configs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ElasticSearch Indices: Super admin only
CREATE POLICY "Super admins can manage ES indices" ON public.elasticsearch_indices
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Perf Metrics: Super admin read, system write
CREATE POLICY "Super admins can view perf metrics" ON public.perf_metrics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "System can insert perf metrics" ON public.perf_metrics
    FOR INSERT WITH CHECK (TRUE);

-- Recommendation Logs: Super admin can view all, users can view their own
CREATE POLICY "Super admins can view all recommendation logs" ON public.recommendation_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view their recommendation logs" ON public.recommendation_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert recommendation logs" ON public.recommendation_logs
    FOR INSERT WITH CHECK (TRUE);

-- Unit Conversion Logs: Public read for statistics, system write
CREATE POLICY "Super admins can view conversion logs" ON public.unit_conversion_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "System can insert conversion logs" ON public.unit_conversion_logs
    FOR INSERT WITH CHECK (TRUE);

-- Version History: Public read, super admin write
CREATE POLICY "Anyone can view version history" ON public.version_history
    FOR SELECT USING (TRUE);

CREATE POLICY "Super admins can manage version history" ON public.version_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ======================================================================================
-- Helpful Indexes and Constraints
-- ======================================================================================

-- Create updated_at trigger for tables that need it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at BEFORE UPDATE ON public.webhook_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elasticsearch_indices_updated_at BEFORE UPDATE ON public.elasticsearch_indices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
