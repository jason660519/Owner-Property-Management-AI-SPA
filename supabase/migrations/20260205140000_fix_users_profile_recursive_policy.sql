-- Fix Users Profile Recursive RLS Policy
-- Date: 2026-02-05
-- Description: Fixes infinite recursion in users_profile RLS policies

-- Drop ALL existing policies on users_profile to start fresh
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users_profile;
DROP POLICY IF EXISTS "agents_view_authorized_landlords_profile" ON public.users_profile;

-- Create simple, non-recursive policies

-- 1. Allow users to insert their own profile (essential for signup)
CREATE POLICY "users_insert_own_profile" ON public.users_profile
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = id);

-- 2. Allow users to view their own profile
CREATE POLICY "users_view_own_profile" ON public.users_profile
    FOR SELECT
    TO public
    USING (auth.uid() = id);

-- 3. Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON public.users_profile
    FOR UPDATE
    TO public
    USING (auth.uid() = id);

-- 4. Allow ALL users (including anon) to view basic profile info
-- This is needed for property listings to show landlord names
-- Uses a constant condition (true) so NO recursion is possible
CREATE POLICY "public_view_basic_profiles" ON public.users_profile
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Add comments for documentation
COMMENT ON POLICY "users_insert_own_profile" ON public.users_profile IS
    'Allows users to create their own profile during signup.';

COMMENT ON POLICY "users_view_own_profile" ON public.users_profile IS
    'Allows users to view their own profile.';

COMMENT ON POLICY "users_update_own_profile" ON public.users_profile IS
    'Allows users to update their own profile.';

COMMENT ON POLICY "public_view_basic_profiles" ON public.users_profile IS
    'Allows anonymous and authenticated users to view basic profile information (e.g., landlord names in property listings). Uses a constant true condition to avoid any recursion.';
