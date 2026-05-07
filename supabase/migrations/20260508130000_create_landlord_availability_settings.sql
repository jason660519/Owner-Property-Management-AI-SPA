-- Landlord availability settings for viewing appointments (AC #5 for row 029)

CREATE TABLE IF NOT EXISTS public.landlord_availability_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users_profile(id) ON DELETE CASCADE,
    open_time TEXT NOT NULL DEFAULT '09:00',
    close_time TEXT NOT NULL DEFAULT '18:00',
    interval_minutes INTEGER NOT NULL DEFAULT 60
        CHECK (interval_minutes IN (30, 60, 90, 120)),
    available_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.landlord_availability_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own availability"
ON public.landlord_availability_settings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
