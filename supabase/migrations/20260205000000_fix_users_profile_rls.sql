-- Fix RLS Infinite Recursion on users_profile
-- Date: 2026-02-05
-- Description: Drops potential recursive policies and establishes clean, safe policies for users_profile.

-- 1. Drop all existing policies on users_profile to ensure a clean slate
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users_profile; -- Potential culprit
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.users_profile;

-- 2. Create non-recursive policies

-- Allow users to insert their own profile (essential for signup)
CREATE POLICY "Users can insert own profile" ON public.users_profile
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users_profile
    FOR SELECT 
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users_profile
    FOR UPDATE 
    USING (auth.uid() = id);

-- Allow authenticated users to view basic profile info (needed for property listings to show owner info)
-- This is safe because it uses a constant condition (true) and doesn't query other tables or functions
CREATE POLICY "Authenticated users can view profiles" ON public.users_profile
    FOR SELECT 
    TO authenticated 
    USING (true);

-- 3. Ensure get_user_roles is optimized and safe (prevent recursion if used elsewhere)
CREATE OR REPLACE FUNCTION public.get_user_roles(lookup_user_id UUID)
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT unnest(roles)
    FROM public.users_profile
    WHERE id = lookup_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
