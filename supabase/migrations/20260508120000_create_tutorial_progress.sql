-- Create tutorial_progress table for cross-device tutorial sync
-- Created: 2026-05-08

CREATE TABLE IF NOT EXISTS public.tutorial_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    completed_step_ids TEXT[] NOT NULL DEFAULT '{}',
    last_step_id TEXT,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

CREATE INDEX idx_tutorial_progress_user ON public.tutorial_progress(user_id);

ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tutorial progress"
ON public.tutorial_progress
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
