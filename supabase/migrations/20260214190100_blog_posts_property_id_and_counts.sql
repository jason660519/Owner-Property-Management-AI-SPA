-- ==============================================================================
-- Add property_id to blog_posts (optional link for 行銷部落格)
-- RPC: get_properties_without_blog_counts for 尚未完成行銷部落格 統計
-- ==============================================================================

-- Optional link to a property (property_sales.id or property_rentals.id)
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS property_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_property_id ON public.blog_posts(property_id) WHERE property_id IS NOT NULL;

COMMENT ON COLUMN public.blog_posts.property_id IS 'Optional: links this blog (行銷部落格) to a property_sales or property_rentals id.';

-- RPC: count sales/rentals that have no blog_post with matching property_id
CREATE OR REPLACE FUNCTION public.get_properties_without_blog_counts()
RETURNS TABLE(sales_without_blog bigint, rentals_without_blog bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::bigint FROM public.property_sales s
     WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts b WHERE b.property_id = s.id)),
    (SELECT count(*)::bigint FROM public.property_rentals r
     WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts b WHERE b.property_id = r.id));
$$;

COMMENT ON FUNCTION public.get_properties_without_blog_counts() IS
  'Returns (count of sales properties with no marketing blog, count of rental properties with no marketing blog).';

REVOKE EXECUTE ON FUNCTION public.get_properties_without_blog_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_properties_without_blog_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_properties_without_blog_counts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_properties_without_blog_counts() TO service_role;
