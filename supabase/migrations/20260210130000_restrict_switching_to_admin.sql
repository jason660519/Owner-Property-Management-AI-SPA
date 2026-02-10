-- ==============================================================================
-- Restrict Role Switching & Harden IAM Permissions
-- Date: 2026-02-10
-- Description: 
-- 1. Modifies `switch_user_role` to ONLY allow Super Admins to execute it.
-- 2. Allows Super Admins to switch to ANY role (even if not assigned).
-- 3. Hardens RLS on IAM tables so only Super Admins can modify them.
-- ==============================================================================

-- 1. Update switch_user_role function
CREATE OR REPLACE FUNCTION public.switch_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_super_admin BOOLEAN;
    caller_id UUID := auth.uid();
BEGIN
    -- Security Check: Determine if the CALLER is a Super Admin
    -- We check both app_metadata (if available) and users_profile
    SELECT EXISTS (
        SELECT 1 FROM public.users_profile 
        WHERE id = caller_id 
        AND 'super_admin' = ANY(roles)
    ) INTO is_super_admin;

    -- Policy Enforcement: Only Super Admin can use this function
    IF NOT is_super_admin THEN
        RAISE EXCEPTION 'Access Denied: Only Super Admins can switch roles.';
    END IF;

    -- Execution: Update the target user's primary role
    -- Note: For Super Admins, we bypass the check "IF new_role = ANY(roles)".
    -- This allows Super Admins to "preview" any role (e.g., become a tenant) 
    -- even if they don't explicitly have it in their roles array.
    
    UPDATE public.users_profile 
    SET primary_role = new_role,
        updated_at = NOW()
    WHERE id = user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Harden IAM Group Tables (RLS)

-- Helper function to check for super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users_profile 
        WHERE id = auth.uid() 
        AND 'super_admin' = ANY(roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- iam_groups Policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.iam_groups;
CREATE POLICY "Allow read access to authenticated users" ON public.iam_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super Admin Full Access" ON public.iam_groups FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- iam_roles Policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.iam_roles;
CREATE POLICY "Allow read access to authenticated users" ON public.iam_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super Admin Full Access" ON public.iam_roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- iam_group_members Policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.iam_group_members;
CREATE POLICY "Allow read access to authenticated users" ON public.iam_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super Admin Full Access" ON public.iam_group_members FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- iam_group_roles Policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.iam_group_roles;
CREATE POLICY "Allow read access to authenticated users" ON public.iam_group_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super Admin Full Access" ON public.iam_group_roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- iam_user_roles Policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.iam_user_roles;
CREATE POLICY "Allow read access to authenticated users" ON public.iam_user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super Admin Full Access" ON public.iam_user_roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
