-- ==============================================================================
-- Auto-assign new users to Registered Users group
-- Date: 2026-02-19
-- Description: When a new users_profile row is created, if the user has no IAM
--              group membership, add them to "Registered Users" group.
--              Backfill existing profiles with no group membership.
-- ==============================================================================

-- 1. Function: add user to Registered Users group if they have no groups
CREATE OR REPLACE FUNCTION public.ensure_user_in_registered_users_group(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reg_group_id UUID;
    has_any_group BOOLEAN;
BEGIN
    IF target_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.iam_group_members WHERE user_id = target_user_id LIMIT 1
    ) INTO has_any_group;

    IF has_any_group THEN
        RETURN;
    END IF;

    SELECT id INTO reg_group_id
    FROM public.iam_groups
    WHERE name = 'Registered Users'
    LIMIT 1;

    IF reg_group_id IS NOT NULL THEN
        INSERT INTO public.iam_group_members (group_id, user_id)
        VALUES (reg_group_id, target_user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.ensure_user_in_registered_users_group(UUID) IS
    'Adds user to Registered Users group when they have no other IAM group membership.';

-- 2. Trigger: on users_profile INSERT, ensure new user is in Registered Users if no other group
CREATE OR REPLACE FUNCTION public.trigger_ensure_registered_users_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.ensure_user_in_registered_users_group(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_registered_users_group_on_profile_insert ON public.users_profile;
CREATE TRIGGER ensure_registered_users_group_on_profile_insert
    AFTER INSERT ON public.users_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_ensure_registered_users_group();

-- 3. Backfill: add existing users with profile but no group membership to Registered Users
DO $$
DECLARE
    rec RECORD;
    reg_group_id UUID;
BEGIN
    SELECT id INTO reg_group_id FROM public.iam_groups WHERE name = 'Registered Users' LIMIT 1;
    IF reg_group_id IS NULL THEN
        RAISE NOTICE 'Registered Users group not found, skip backfill.';
        RETURN;
    END IF;

    FOR rec IN
        SELECT up.id
        FROM public.users_profile up
        WHERE NOT EXISTS (
            SELECT 1 FROM public.iam_group_members gm WHERE gm.user_id = up.id
        )
    LOOP
        INSERT INTO public.iam_group_members (group_id, user_id)
        VALUES (reg_group_id, rec.id)
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END LOOP;
END;
$$;
