-- ==============================================================================
-- Blog post generation context
-- Persists builder-side generation choices such as selected content sections.
-- ==============================================================================

ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS generation_context jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.blog_posts.generation_context IS
  'Structured generation context for blog variants, such as selectedSectionIds from the advertisement builder.';