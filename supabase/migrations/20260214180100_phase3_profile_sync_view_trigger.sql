-- ==============================================================================
-- Phase 3: View + Trigger — profile.role cache from IAM (Option A)
-- Date: 2026-02-14
-- Description: get_user_roles from IAM; trigger syncs IAM -> users_profile cache;
--              view as read interface; protect trigger bypass for sync.
--              See docs/operational-guides/iam/iam_single_source_option_a.md
-- ==============================================================================

-- 1. Restore get_user_roles to read from IAM (single source of truth)
CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS TABLE (role_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- Direct roles
    SELECT r.name
    FROM public.iam_roles r
    JOIN public.iam_user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = lookup_user_id
    UNION
    -- Group roles
    SELECT r.name
    FROM public.iam_roles r
    JOIN public.iam_group_roles gr ON r.id = gr.role_id
    JOIN public.iam_groups g ON gr.group_id = g.id
    JOIN public.iam_group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = lookup_user_id;
END;
$$;

-- 2. Allow protect_critical_user_fields to skip when sync is writing (session var)
CREATE OR REPLACE FUNCTION public.protect_critical_user_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.bypass_role_protection', true) = 'true' THEN
        RETURN NEW;
    END IF;
    IF CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin') THEN
        RETURN NEW;
    END IF;
    IF auth.uid() = NEW.id THEN
        IF NEW.roles IS DISTINCT FROM OLD.roles THEN
            RAISE EXCEPTION 'Cannot modify roles directly. Contact support.';
        END IF;
        IF NEW.primary_role IS DISTINCT FROM OLD.primary_role THEN
            RAISE EXCEPTION 'Cannot modify primary_role directly. Use switch_user_role().';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Sync profile.role / primary_role / roles from IAM (trigger + backfill)
--    Priority for primary_role when multiple roles (first match wins)
CREATE OR REPLACE FUNCTION public.sync_profile_roles_from_iam(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    role_list TEXT[] := ARRAY(SELECT role_name FROM public.get_user_roles(target_user_id));
    primary_val TEXT;
    priority_order TEXT[] := ARRAY[
        'super_admin', 'system_engineer', 'cybersecurity_engineer',
        'landlord', 'agent', 'auditor', 'tenant', 'contract_buyer', 'buyer',
        'vendor', 'potential_tenant', 'potential_buyer', 'register'
    ];
    r TEXT;
BEGIN
    IF array_length(role_list, 1) IS NULL OR role_list = '{}' THEN
        role_list := ARRAY['register'];
        primary_val := 'register';
    ELSE
        primary_val := NULL;
        FOREACH r IN ARRAY priority_order
        LOOP
            IF r = ANY(role_list) THEN
                primary_val := r;
                EXIT;
            END IF;
        END LOOP;
        IF primary_val IS NULL THEN
            primary_val := role_list[1];
        END IF;
    END IF;

    PERFORM set_config('app.bypass_role_protection', 'true', true);
    UPDATE public.users_profile
    SET role = primary_val,
        primary_role = primary_val,
        roles = role_list,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$;

-- 4. Trigger on IAM tables: after change, sync affected user(s)
CREATE OR REPLACE FUNCTION public.trigger_sync_profile_on_iam_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.user_id IS NOT NULL THEN
            PERFORM public.sync_profile_roles_from_iam(OLD.user_id);
        END IF;
        RETURN OLD;
    END IF;
    IF NEW.user_id IS NOT NULL THEN
        PERFORM public.sync_profile_roles_from_iam(NEW.user_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id AND OLD.user_id IS NOT NULL THEN
        PERFORM public.sync_profile_roles_from_iam(OLD.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_profile_on_iam_group_members_change ON public.iam_group_members;
CREATE TRIGGER sync_profile_on_iam_group_members_change
    AFTER INSERT OR UPDATE OR DELETE ON public.iam_group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_profile_on_iam_change();

DROP TRIGGER IF EXISTS sync_profile_on_iam_user_roles_change ON public.iam_user_roles;
CREATE TRIGGER sync_profile_on_iam_user_roles_change
    AFTER INSERT OR UPDATE OR DELETE ON public.iam_user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sync_profile_on_iam_change();

-- 5. View as read interface (exposes trigger-maintained cache)
DROP VIEW IF EXISTS public.users_profile_with_role;
CREATE VIEW public.users_profile_with_role AS
SELECT * FROM public.users_profile;

COMMENT ON VIEW public.users_profile_with_role IS 'Read interface for profile; role/primary_role/roles are synced from IAM via trigger.';

-- 6. Backfill: sync existing profiles from IAM (users with no IAM membership get primary_role = register)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM public.users_profile
    LOOP
        PERFORM public.sync_profile_roles_from_iam(rec.id);
    END LOOP;
END;
$$;
