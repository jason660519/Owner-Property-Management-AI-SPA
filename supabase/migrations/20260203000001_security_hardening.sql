-- ==============================================================================
-- Security Hardening
-- Created: 2026-02-03
-- Description: Secures critical RPCs and protects sensitive columns
-- ==============================================================================

-- 1. Secure add_user_role RPC
-- Only allow super_admins to call this function
CREATE OR REPLACE FUNCTION public.add_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if the executing user is a super_admin
    SELECT EXISTS (
        SELECT 1 
        FROM public.users_profile
        WHERE id = auth.uid() 
        AND (
            primary_role = 'super_admin' 
            OR 'super_admin' = ANY(roles)
        )
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only super_admins can add roles';
    END IF;

    -- Add new role to array (avoid duplicates)
    UPDATE public.users_profile 
    SET roles = ARRAY(SELECT DISTINCT UNNEST(roles || ARRAY[new_role])),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Protect critical columns in users_profile
CREATE OR REPLACE FUNCTION public.protect_critical_user_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates from service_role or security definer functions (postgres)
    IF CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- If the user is updating their own profile via API
    IF auth.uid() = NEW.id THEN
        -- Prevent changing roles directly
        IF NEW.roles IS DISTINCT FROM OLD.roles THEN
             RAISE EXCEPTION 'Cannot modify roles directly. Contact support.';
        END IF;
        
        -- Prevent changing primary_role directly (must use switch_user_role)
        IF NEW.primary_role IS DISTINCT FROM OLD.primary_role THEN
             RAISE EXCEPTION 'Cannot modify primary_role directly. Use switch_user_role().';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS protect_user_profile_fields ON public.users_profile;
CREATE TRIGGER protect_user_profile_fields
    BEFORE UPDATE ON public.users_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_critical_user_fields();

-- 3. Verify get_user_roles helper exists (re-create to be safe and optimized)
CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT unnest(roles)
    FROM public.users_profile
    WHERE id = lookup_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
