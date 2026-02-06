-- =============================================================================
-- Migration: Create Form Drafts Table
-- Date: 2026-02-06
-- Description: Store multi-step form drafts (e.g. landlord property add form)
--              in Supabase instead of browser localStorage.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.form_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    form_key TEXT NOT NULL,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.form_drafts
    ADD CONSTRAINT form_drafts_user_fk
    FOREIGN KEY (user_id)
    REFERENCES public.users_profile(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_drafts_user_form
    ON public.form_drafts(user_id, form_key, updated_at DESC);

-- Enable RLS
ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage only their own drafts
CREATE POLICY "users_manage_own_form_drafts"
    ON public.form_drafts
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Keep updated_at in sync
CREATE TRIGGER update_form_drafts_updated_at
    BEFORE UPDATE ON public.form_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

