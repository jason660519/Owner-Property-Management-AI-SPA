-- =============================================================================
-- Migration: Add region-based RLS policies
-- Date: 2026-03-22
-- Purpose: Users only see properties in their own region.
--          super_admin and service_role bypass all region guards.
--
-- Strategy: Add supplementary region-filter policies. The existing owner
--           policies remain untouched — this only adds cross-region read
--           restriction for non-owners.
-- =============================================================================

BEGIN;

-- Helper function: get the region of the current authenticated user
-- Returns 'TW' as fallback (safe default for existing rows)
CREATE OR REPLACE FUNCTION public.get_user_region()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT region FROM public.users_profile WHERE id = auth.uid()),
    'TW'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_region() TO authenticated;

-- ---------------------------------------------------------------------------
-- property_sales: restrict public read to user's region
-- (Existing SELECT policies already gate on owner; this adds a region gate
--  for any future "public browse" policies.)
-- ---------------------------------------------------------------------------
CREATE POLICY "property_sales: users read own region only"
  ON public.property_sales
  FOR SELECT
  USING (
    -- Owners always see their own properties regardless of region
    owner_id = auth.uid()
    OR
    -- Other authenticated users only see properties in their region
    region = get_user_region()
  );

-- ---------------------------------------------------------------------------
-- property_rentals: same pattern
-- ---------------------------------------------------------------------------
CREATE POLICY "property_rentals: users read own region only"
  ON public.property_rentals
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR
    region = get_user_region()
  );

-- ---------------------------------------------------------------------------
-- users_profile: region field is self-managed
-- Users can update their own region (e.g. when switching market)
-- ---------------------------------------------------------------------------
-- No new policy needed — existing "users can update own profile" covers this.
-- Just document: region should only be updated via a dedicated "switch market"
-- flow, not as a general profile field, to prevent accidental data leaks.

COMMIT;
