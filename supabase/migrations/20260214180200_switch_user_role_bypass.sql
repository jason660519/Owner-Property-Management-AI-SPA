-- ==============================================================================
-- switch_user_role: set app.bypass_role_protection so protect trigger allows update
-- Date: 2026-02-14
-- Description: Option A transition — profile.role is synced from IAM; allow
--              switch_user_role (Super Admin only) to still update primary_role.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.switch_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_super_admin BOOLEAN;
    caller_id UUID := auth.uid();
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.users_profile 
        WHERE id = caller_id 
        AND 'super_admin' = ANY(roles)
    ) INTO is_super_admin;

    IF NOT is_super_admin THEN
        RAISE EXCEPTION 'Access Denied: Only Super Admins can switch roles.';
    END IF;

    PERFORM set_config('app.bypass_role_protection', 'true', true);
    UPDATE public.users_profile 
    SET primary_role = new_role,
        role = new_role,
        updated_at = NOW()
    WHERE id = user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
