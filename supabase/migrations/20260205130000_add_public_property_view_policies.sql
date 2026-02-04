-- Add Public Property View Policies
-- Date: 2026-02-05
-- Description: Allows public (including anonymous users) to view available/vacant properties

-- Property Sales: Allow public to view available properties
CREATE POLICY "public_view_available_sales" ON public.property_sales
    FOR SELECT
    TO anon, authenticated
    USING (status = 'available');

-- Property Rentals: Allow public to view vacant properties
CREATE POLICY "public_view_vacant_rentals" ON public.property_rentals
    FOR SELECT
    TO anon, authenticated
    USING (status = 'vacant');

-- Add comment for documentation
COMMENT ON POLICY "public_view_available_sales" ON public.property_sales IS
    'Allows anonymous and authenticated users to view properties listed for sale (status = available). This is needed for public property listings on the homepage and property search pages.';

COMMENT ON POLICY "public_view_vacant_rentals" ON public.property_rentals IS
    'Allows anonymous and authenticated users to view rental properties that are vacant (status = vacant). This is needed for public property listings on the homepage and property search pages.';
