-- ==============================================================================
-- RPC: get_properties_without_photo_counts
-- Description: Returns counts of sales/rentals properties that have no photos.
-- Used by Superadmin dashboard 物件照片概況 card.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_properties_without_photo_counts()
RETURNS TABLE(sales_without_photo bigint, rentals_without_photo bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::bigint FROM public.property_sales s
     WHERE NOT EXISTS (SELECT 1 FROM public.property_photos p WHERE p.property_id = s.id)),
    (SELECT count(*)::bigint FROM public.property_rentals r
     WHERE NOT EXISTS (SELECT 1 FROM public.property_photos p WHERE p.property_id = r.id));
$$;

COMMENT ON FUNCTION public.get_properties_without_photo_counts() IS
  'Returns (count of sales properties with no photos, count of rental properties with no photos).';

REVOKE EXECUTE ON FUNCTION public.get_properties_without_photo_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_properties_without_photo_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_properties_without_photo_counts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_properties_without_photo_counts() TO service_role;
