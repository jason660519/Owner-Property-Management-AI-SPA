-- Add avatar_url column to users_profile
-- Populated for OAuth users (Google: raw_user_meta_data->>'picture',
-- Facebook: raw_user_meta_data->>'avatar_url').
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill existing OAuth users from auth.users.raw_user_meta_data.
-- Google stores the avatar under 'avatar_url' (Supabase normalised) or 'picture'.
-- Facebook stores it under 'avatar_url' after Supabase normalisation.
UPDATE public.users_profile up
SET avatar_url = COALESCE(
  au.raw_user_meta_data->>'avatar_url',
  au.raw_user_meta_data->>'picture'
)
FROM auth.users au
WHERE up.id          = au.id
  AND up.avatar_url  IS NULL
  AND (
    au.raw_user_meta_data->>'avatar_url' IS NOT NULL
    OR au.raw_user_meta_data->>'picture' IS NOT NULL
  );
