-- ==============================================================================
-- Phase 4 (partial): has_role() + validate_agent_authorization / is_owner_or_authorized_agent use IAM
-- Date: 2026-02-14
-- Description: Option A — RLS helpers and trigger use get_user_roles/has_role (IAM).
--              Existing RLS policies still reference users_profile.role (synced from IAM by trigger).
-- ==============================================================================

-- 1. has_role(lookup_user_id, role_name) for RLS and triggers
CREATE OR REPLACE FUNCTION public.has_role(lookup_user_id UUID, role_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.get_user_roles(lookup_user_id) AS gr(rn)
        WHERE gr.rn = role_name
    );
END;
$$;

COMMENT ON FUNCTION public.has_role IS 'Option A: Check if user has role from IAM (get_user_roles).';

-- 2. validate_agent_authorization: use has_role instead of users_profile.role
CREATE OR REPLACE FUNCTION public.validate_agent_authorization()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT public.has_role(NEW.landlord_id, 'landlord') THEN
        RAISE EXCEPTION 'landlord_id 必須對應到角色為 landlord 的使用者';
    END IF;
    IF NOT public.has_role(NEW.agent_id, 'agent') THEN
        RAISE EXCEPTION 'agent_id 必須對應到角色為 agent 的使用者';
    END IF;
    IF NEW.property_ids IS NOT NULL THEN
        IF NOT (
            SELECT bool_and(
                EXISTS (SELECT 1 FROM public.Property_Rentals WHERE id = pid AND owner_id = NEW.landlord_id)
                OR
                EXISTS (SELECT 1 FROM public.Property_Sales WHERE id = pid AND owner_id = NEW.landlord_id)
            )
            FROM unnest(NEW.property_ids) AS pid
        ) THEN
            RAISE EXCEPTION 'property_ids 包含無效或不屬於該房東的物件';
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. is_owner_or_authorized_agent: use has_role instead of reading users_profile.role
CREATE OR REPLACE FUNCTION public.is_owner_or_authorized_agent(
    p_user_id UUID,
    p_landlord_id UUID,
    p_property_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    IF p_user_id = p_landlord_id THEN
        RETURN TRUE;
    END IF;
    IF public.has_role(p_user_id, 'agent') THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.agent_authorizations aa
            WHERE aa.agent_id = p_user_id
              AND aa.landlord_id = p_landlord_id
              AND aa.status = 'active'
              AND aa.valid_from <= NOW()
              AND (aa.valid_until IS NULL OR aa.valid_until >= NOW())
              AND (
                p_property_id IS NULL
                OR aa.property_ids IS NULL
                OR p_property_id = ANY(aa.property_ids)
              )
        ) INTO v_is_authorized;
        RETURN v_is_authorized;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
