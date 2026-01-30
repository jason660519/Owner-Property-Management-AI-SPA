-- ======================================================================================
-- Migration: Super Admin & System Core Tables (RBAC, Settings, Logs)
-- Date: 2026-01-30
-- Description: Implements the Super Admin dashboard requirements and system-level configuration tables.
-- ======================================================================================

-- 1. Advanced RBAC System
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g. 'super_admin', 'landlord', 'tenant', 'agency_admin'
    display_name TEXT NOT NULL,
    description TEXT,
    is_system_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. 'users.view', 'properties.edit'
    module TEXT NOT NULL, -- e.g. 'users', 'finance', 'system'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Note: user_roles is implicitly handled by users_profile.role currently, 
-- but we might want a many-to-many if a user can have multiple roles. 
-- For now, we assume simple 1 role per user as per previous schema, 
-- but we should link it to the roles table if possible.
-- ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- 2. System Settings & Configurations
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY, -- e.g. 'site_name', 'maintenance_mode'
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.users_profile(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.llm_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL, -- e.g. 'gpt-4', 'claude-3-opus'
    provider TEXT NOT NULL, -- e.g. 'openai', 'anthropic'
    api_key_enc TEXT, -- Encrypted API Key
    is_active BOOLEAN DEFAULT TRUE,
    parameters JSONB DEFAULT '{}', -- e.g. temperature, max_tokens
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seo_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_route TEXT NOT NULL UNIQUE, -- e.g. '/landing', '/pricing'
    title TEXT NOT NULL,
    meta_description TEXT,
    keywords TEXT[],
    og_image_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. 'welcome_email', 'reset_password'
    channel TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    subject TEXT,
    body_content TEXT NOT NULL, -- Supports variables {{name}}
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Internationalization & Localization
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.currencies (
    code TEXT PRIMARY KEY, -- 'USD', 'TWD'
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT REFERENCES public.currencies(code),
    to_currency TEXT REFERENCES public.currencies(code),
    rate NUMERIC NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.i18n_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL, -- e.g. 'welcome_message'
    lang_code TEXT NOT NULL, -- 'en', 'zh-TW'
    value TEXT NOT NULL,
    UNIQUE(key, lang_code)
);

CREATE TABLE IF NOT EXISTS public.regions_settings (
    country_code TEXT PRIMARY KEY, -- 'TW', 'US'
    currency_code TEXT REFERENCES public.currencies(code),
    tax_rate_percentage NUMERIC DEFAULT 0,
    features_enabled JSONB DEFAULT '{}'
);

-- 4. Security & Access Control
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.whitelist_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('ip', 'email_domain', 'user_id')),
    list_type TEXT NOT NULL CHECK (list_type IN ('white', 'black')),
    value TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_pattern TEXT NOT NULL,
    role_level TEXT DEFAULT 'public', -- 'public', 'user', 'admin'
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Logs, Monitoring & Auditing (High Volume)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'create_property', 'delete_user'
    resource_table TEXT,
    resource_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    duration_ms INTEGER,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    request_payload JSONB, -- Be careful with PII
    response_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- 'frontend', 'backend', 'worker'
    level TEXT NOT NULL, -- 'error', 'critical', 'warning'
    message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name TEXT NOT NULL, -- 'backup_db', 'cleanup_logs'
    status TEXT NOT NULL, -- 'success', 'failed', 'running'
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    details TEXT
);

CREATE TABLE IF NOT EXISTS public.backup_restore_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL, -- 'full', 'incremental'
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cloud_resources_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL, -- 'database', 'storage', 'function'
    metric_name TEXT NOT NULL, -- 'cpu_usage', 'disk_iops'
    value NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AI & Analytics Specifics
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.ai_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost NUMERIC,
    latency_ms INTEGER,
    user_feedback_score INTEGER, -- 1-5
    request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.web_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path TEXT NOT NULL,
    visitor_id TEXT,
    session_id TEXT,
    event_type TEXT, -- 'pageview', 'click', 'scroll'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.i18n_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_restore_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_resources_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_analytics ENABLE ROW LEVEL SECURITY;

-- Creating specific Super Admin Policies (Read/Write All)
-- NOTE: We assume a function or claim 'is_super_admin' exists or we check defined roles.
-- For simplicity in this migration, we create basic policies.

CREATE POLICY "Super Admins can do everything on roles" ON public.roles
    FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin'); 
    -- Note: This relies on Supabase Auth metadata or custom claims.
    -- Alternative: USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'super_admin'))

CREATE POLICY "everyone can read public roles" ON public.roles
    FOR SELECT USING (TRUE);

-- ... (Similar policies would be generated for all tables, limiting write access to super_admin)
