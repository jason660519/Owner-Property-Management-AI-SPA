-- ==============================================================================
-- Fix IAM RLS Policies
-- Created: 2026-02-02
-- Description: Adds missing INSERT/UPDATE/DELETE policies for Super Admins
-- ==============================================================================

-- Policy: Allow Super Admins to Insert/Update/Delete Groups
create policy "Allow super_admin to manage groups"
    on public.iam_groups
    for all
    to authenticated
    using (
        exists (
            select 1 from public.get_user_roles(auth.uid()) as role_name
            where role_name = 'super_admin'
        )
    );

-- Policy: Allow Super Admins to Manage Group Members
create policy "Allow super_admin to manage group members"
    on public.iam_group_members
    for all
    to authenticated
    using (
        exists (
            select 1 from public.get_user_roles(auth.uid()) as role_name
            where role_name = 'super_admin'
        )
    );

-- Policy: Allow Super Admins to Manage Group Roles
create policy "Allow super_admin to manage group roles"
    on public.iam_group_roles
    for all
    to authenticated
    using (
        exists (
            select 1 from public.get_user_roles(auth.uid()) as role_name
            where role_name = 'super_admin'
        )
    );

-- Policy: Allow Super Admins to Manage User Roles (Exceptions)
create policy "Allow super_admin to manage user roles"
    on public.iam_user_roles
    for all
    to authenticated
    using (
        exists (
            select 1 from public.get_user_roles(auth.uid()) as role_name
            where role_name = 'super_admin'
        )
    );
