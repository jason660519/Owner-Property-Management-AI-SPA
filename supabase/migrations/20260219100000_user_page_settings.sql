-- ======================================================================================
-- Migration: User Page Settings (per-user UI state, e.g. column widths)
-- Date: 2026-02-19
-- Description: Store per-user, per-page UI settings so the same account gets the same
--              layout across browsers/devices (e.g. Superadmin Project Progress column widths).
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.user_page_settings (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_key TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, page_key)
);

CREATE INDEX idx_user_page_settings_user_id ON public.user_page_settings(user_id);

COMMENT ON TABLE public.user_page_settings IS 'Per-user, per-page UI preferences (e.g. project_progress column widths, presets). Synced across devices when user logs in.';

-- RLS: users can only read/upsert their own row
ALTER TABLE public.user_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_page_settings_select_own
    ON public.user_page_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY user_page_settings_insert_own
    ON public.user_page_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_page_settings_update_own
    ON public.user_page_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_page_settings_delete_own
    ON public.user_page_settings FOR DELETE
    USING (auth.uid() = user_id);
