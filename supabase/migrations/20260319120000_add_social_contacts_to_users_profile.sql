-- Add social contact fields to users_profile for multi-channel blog CTA support
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS line_id       TEXT,
  ADD COLUMN IF NOT EXISTS wechat_id     TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp      TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url  TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;

COMMENT ON COLUMN public.users_profile.line_id       IS 'LINE ID for contact CTA';
COMMENT ON COLUMN public.users_profile.wechat_id     IS 'WeChat ID for contact CTA';
COMMENT ON COLUMN public.users_profile.whatsapp      IS 'WhatsApp number in E.164 format (e.g. +886912345678)';
COMMENT ON COLUMN public.users_profile.facebook_url  IS 'Facebook profile or page URL';
COMMENT ON COLUMN public.users_profile.instagram_url IS 'Instagram profile URL or username';
