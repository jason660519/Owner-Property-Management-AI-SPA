-- ==============================================================================
-- Blog post variant identity
-- Ensures each property/style/platform/reference-url combination is stored separately.
-- Also backfills the missing style/platform columns in source-controlled migrations.
-- ==============================================================================

ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS blog_style_preset text,
ADD COLUMN IF NOT EXISTS blog_target_platform text,
ADD COLUMN IF NOT EXISTS reference_url text,
ADD COLUMN IF NOT EXISTS reference_url_normalized text;

CREATE INDEX IF NOT EXISTS idx_blog_posts_variant_lookup
ON public.blog_posts(property_id, blog_style_preset, blog_target_platform, reference_url_normalized)
WHERE property_id IS NOT NULL
  AND blog_style_preset IS NOT NULL
  AND blog_target_platform IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_posts_variant_identity
ON public.blog_posts(
  property_id,
  blog_style_preset,
  blog_target_platform,
  COALESCE(reference_url_normalized, '')
)
WHERE property_id IS NOT NULL
  AND blog_style_preset IS NOT NULL
  AND blog_target_platform IS NOT NULL;

COMMENT ON COLUMN public.blog_posts.blog_style_preset IS
  'Generated blog visual preset identifier, for example luxury_dark or bright_clean.';

COMMENT ON COLUMN public.blog_posts.blog_target_platform IS
  'Target publishing platform for the generated variant, for example local or google_blogger.';

COMMENT ON COLUMN public.blog_posts.reference_url IS
  'Original reference page URL used for style analysis when provided by the user.';

COMMENT ON COLUMN public.blog_posts.reference_url_normalized IS
  'Canonicalized reference URL used as part of the persisted blog variant identity.';